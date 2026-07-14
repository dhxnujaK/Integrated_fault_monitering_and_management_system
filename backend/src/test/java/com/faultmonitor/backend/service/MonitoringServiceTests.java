package com.faultmonitor.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.dto.EquipmentStatusResponse;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@Transactional
class MonitoringServiceTests {

    @Autowired
    private MonitoringService monitoringService;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SensorReadingRepository sensorReadingRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        alarmRepository.deleteAll();
        sensorReadingRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
    }

    @Test
    void reportsOfflineWithoutAReading() {
        EquipmentStatusResponse status = monitoringService.status(generator.getId());

        assertThat(status.overallStatus()).isEqualTo("OFFLINE");
        assertThat(status.recordedAt()).isNull();
        assertThat(status.latestReading()).isEmpty();
    }

    @Test
    void returnsLatestReadingAndComputedNormalStatus() {
        sensorReadingRepository.saveAndFlush(SensorReading.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .readingData("{\"fuel_level_pct\":80.0,\"running_status\":\"RUNNING\"}")
                .build());

        EquipmentStatusResponse status = monitoringService.status(generator.getId());

        assertThat(status.overallStatus()).isEqualTo("NORMAL");
        assertThat(status.recordedAt()).isNotNull();
        assertThat(status.latestReading()).containsEntry("fuel_level_pct", 80.0);
    }
}
