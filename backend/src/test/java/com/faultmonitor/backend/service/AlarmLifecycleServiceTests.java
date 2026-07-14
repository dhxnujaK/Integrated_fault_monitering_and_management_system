package com.faultmonitor.backend.service;

import static com.faultmonitor.backend.fixture.AlarmLifecycleFixture.generatorWithFuelLevel;
import static com.faultmonitor.backend.fixture.AlarmLifecycleFixture.normalGenerator;
import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.dto.AlarmResponse;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Role;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.UserRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@Transactional
class AlarmLifecycleServiceTests {

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private UserRepository userRepository;

    private Equipment generator;
    private Equipment ups;
    private User operator;

    @BeforeEach
    void setUp() {
        alarmRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
        ups = equipmentRepository.findByEquipmentCode("UPS-01").orElseThrow();
        operator = userRepository.save(User.builder()
                .username("lifecycle-operator")
                .passwordHash("not-used-in-test")
                .role(Role.OPERATOR)
                .build());
    }

    @Test
    void repeatableDemoTriggerAcknowledgeClearAndRetrigger() {
        alarmService.checkGenerator(generator, generatorWithFuelLevel(15.0));
        alarmService.checkGenerator(generator, generatorWithFuelLevel(15.0));

        List<Alarm> firstOccurrence = alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                generator.getId(), "GEN_LOW_FUEL", List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED));
        assertThat(firstOccurrence).hasSize(1);

        AlarmResponse acknowledged = alarmService.acknowledge(
                firstOccurrence.get(0).getId(), "Technician notified.", operator.getUsername());
        assertThat(acknowledged.status()).isEqualTo(AlarmStatus.ACKNOWLEDGED);
        assertThat(acknowledged.acknowledgedBy().username()).isEqualTo(operator.getUsername());
        assertThat(acknowledged.acknowledgementNote()).isEqualTo("Technician notified.");

        alarmService.checkGenerator(generator, normalGenerator());
        Alarm resolved = alarmRepository.findById(firstOccurrence.get(0).getId()).orElseThrow();
        assertThat(resolved.getStatus()).isEqualTo(AlarmStatus.RESOLVED);
        assertThat(resolved.getResolvedAt()).isNotNull();

        alarmService.checkGenerator(generator, generatorWithFuelLevel(15.0));
        assertThat(alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                generator.getId(), "GEN_LOW_FUEL", List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED)))
                .hasSize(1)
                .first().extracting(Alarm::getId).isNotEqualTo(resolved.getId());
    }

    @Test
    void upsConditionCreatesAndAutomaticallyResolvesAlarm() {
        alarmService.checkUPS(ups, Map.of(
                "operational_status", "ON_BATTERY",
                "battery_charge_pct", 15.0,
                "load_pct", 85.0));

        assertThat(alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                ups.getId(), "UPS_BATTERY_CRITICAL", List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED)))
                .hasSize(1);
        assertThat(alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                ups.getId(), "UPS_ON_BATTERY", List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED)))
                .hasSize(1);

        alarmService.checkUPS(ups, Map.of(
                "operational_status", "ONLINE",
                "battery_charge_pct", 80.0,
                "load_pct", 40.0));

        assertThat(alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                ups.getId(), "UPS_BATTERY_CRITICAL", List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED)))
                .isEmpty();
        assertThat(alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                ups.getId(), "UPS_ON_BATTERY", List.of(AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED)))
                .isEmpty();
    }
}
