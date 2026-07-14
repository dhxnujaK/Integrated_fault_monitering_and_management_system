package com.faultmonitor.backend.bootstrap;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-way compatibility migration for rows created before equipmentId existed.
 * A row is linked only when its legacy subsystem type and id exactly match a
 * seeded/configured equipment record; unmatched rows are left untouched.
 */
@Component
@Order(2)
public class EquipmentBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(EquipmentBackfillRunner.class);

    private final EquipmentRepository equipmentRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AlarmRepository alarmRepository;

    public EquipmentBackfillRunner(
            EquipmentRepository equipmentRepository,
            SensorReadingRepository sensorReadingRepository,
            AlarmRepository alarmRepository) {
        this.equipmentRepository = equipmentRepository;
        this.sensorReadingRepository = sensorReadingRepository;
        this.alarmRepository = alarmRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        int readings = sensorReadingRepository.findByEquipmentIsNull().stream()
                .filter(this::attachEquipment)
                .toList()
                .size();
        int alarms = alarmRepository.findByEquipmentIsNull().stream()
                .filter(this::attachEquipment)
                .toList()
                .size();

        if (readings + alarms > 0) {
            log.info("Backfilled equipment relationships for {} readings and {} alarms.", readings, alarms);
        }
    }

    private boolean attachEquipment(SensorReading reading) {
        Optional<Equipment> equipment = matchingEquipment(reading.getSubsystemId(), reading.getSubsystemType());
        equipment.ifPresent(reading::setEquipment);
        return equipment.isPresent();
    }

    private boolean attachEquipment(Alarm alarm) {
        Optional<Equipment> equipment = matchingEquipment(alarm.getSubsystemId(), alarm.getSubsystemType());
        equipment.ifPresent(alarm::setEquipment);
        return equipment.isPresent();
    }

    private Optional<Equipment> matchingEquipment(String code, com.faultmonitor.backend.entity.SubsystemType type) {
        return equipmentRepository.findByEquipmentCode(code)
                .filter(equipment -> equipment.getEquipmentType() == type);
    }
}
