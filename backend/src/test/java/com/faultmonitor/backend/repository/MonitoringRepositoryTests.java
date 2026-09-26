package com.faultmonitor.backend.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

@DataJpaTest
class MonitoringRepositoryTests {

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SensorReadingRepository sensorReadingRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    @Test
    void returnsNewestReadingsAndBothUnresolvedAlarmStatesForEquipment() {
        Equipment equipment = equipmentRepository.save(Equipment.builder()
                .equipmentCode("GENERATOR-TEST")
                .equipmentType(SubsystemType.GENERATOR)
                .displayName("Repository Test Generator")
                .location("Test Lab")
                .build());
        sensorReadingRepository.save(reading(equipment, "{\"fuel_level_pct\":80}",
                LocalDateTime.now().minusSeconds(5)));
        SensorReading newest = sensorReadingRepository.save(reading(
                equipment, "{\"fuel_level_pct\":15}", LocalDateTime.now()));
        alarmRepository.save(alarm(equipment, "GEN_LOW_FUEL", AlarmStatus.ACTIVE));
        alarmRepository.save(alarm(equipment, "GEN_HIGH_TEMP", AlarmStatus.ACKNOWLEDGED));
        alarmRepository.save(alarm(equipment, "GEN_FIRE", AlarmStatus.RESOLVED));

        assertThat(sensorReadingRepository.findFirstByEquipmentIdOrderByRecordedAtDesc(equipment.getId()))
                .contains(newest);
        assertThat(alarmRepository.findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
                equipment.getId(), List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED)))
                .extracting(Alarm::getStatus)
                .containsExactlyInAnyOrder(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED);
    }

    private SensorReading reading(Equipment equipment, String data, LocalDateTime recordedAt) {
        return SensorReading.builder()
                .equipment(equipment)
                .subsystemType(equipment.getEquipmentType())
                .subsystemId(equipment.getEquipmentCode())
                .readingData(data)
                .recordedAt(recordedAt)
                .build();
    }

    private Alarm alarm(Equipment equipment, String code, AlarmStatus status) {
        return Alarm.builder()
                .equipment(equipment)
                .subsystemType(equipment.getEquipmentType())
                .subsystemId(equipment.getEquipmentCode())
                .alarmCode(code)
                .alarmMessage(code)
                .severity(AlarmSeverity.WARNING)
                .status(status)
                .build();
    }
}
