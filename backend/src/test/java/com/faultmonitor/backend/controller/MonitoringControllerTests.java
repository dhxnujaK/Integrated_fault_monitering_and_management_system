package com.faultmonitor.backend.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Role;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import com.faultmonitor.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@AutoConfigureMockMvc
@Transactional
class MonitoringControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SensorReadingRepository sensorReadingRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private UserRepository userRepository;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        alarmRepository.deleteAll();
        sensorReadingRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void statusEndpointReturnsContractShape() throws Exception {
        sensorReadingRepository.saveAndFlush(SensorReading.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .readingData("{\"fuel_level_pct\":80.0}")
                .build());

        mockMvc.perform(get("/api/equipment/{id}/status", generator.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.equipmentCode").value("GENERATOR-01"))
                .andExpect(jsonPath("$.overallStatus").value("NORMAL"))
                .andExpect(jsonPath("$.activeAlarmCount").value(0))
                .andExpect(jsonPath("$.latestReading.fuel_level_pct").value(80.0));
    }

    @Test
    @WithMockUser(username = "controller-operator", roles = "OPERATOR")
    void acknowledgeEndpointPersistsCurrentUserAndNote() throws Exception {
        userRepository.save(User.builder()
                .username("controller-operator")
                .passwordHash("not-used-in-test")
                .role(Role.OPERATOR)
                .build());
        Alarm alarm = alarmRepository.saveAndFlush(Alarm.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .alarmCode("GEN_LOW_FUEL")
                .alarmMessage("Low fuel")
                .severity(AlarmSeverity.WARNING)
                .status(AlarmStatus.ACTIVE)
                .build());

        mockMvc.perform(put("/api/alarms/{id}/acknowledge", alarm.getId())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"note\":\"Technician notified.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACKNOWLEDGED"))
                .andExpect(jsonPath("$.acknowledgedBy.username").value("controller-operator"))
                .andExpect(jsonPath("$.acknowledgementNote").value("Technician notified."));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void globalAlarmEndpointRejectsConflictingFilters() throws Exception {
        mockMvc.perform(get("/api/alarms")
                        .param("status", "ACTIVE")
                        .param("unresolved", "true"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
