package com.faultmonitor.backend.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@AutoConfigureMockMvc
@Transactional
class DiagnosisControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        alarmRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
        alarmRepository.saveAndFlush(Alarm.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .alarmCode("GEN_LOW_FUEL")
                .alarmMessage("Low fuel")
                .severity(AlarmSeverity.WARNING)
                .status(AlarmStatus.ACTIVE)
                .build());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void diagnosisCatalogIsAvailable() throws Exception {
        mockMvc.perform(get("/api/diagnosis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.key == 'GEN_LOW_FUEL')]").exists());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void diagnosisLookupAcceptsPredictionFailureType() throws Exception {
        mockMvc.perform(get("/api/diagnosis/{key}", "GEN_OVERHEAT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.key").value("GEN_OVERHEAT"))
                .andExpect(jsonPath("$.correctiveActions[0].step").value(1));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void equipmentDiagnosisReturnsAlarmAndDiagnosisTogether() throws Exception {
        mockMvc.perform(get("/api/equipment/{id}/diagnosis", generator.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alarm.alarmCode").value("GEN_LOW_FUEL"))
                .andExpect(jsonPath("$[0].diagnosis.key").value("GEN_LOW_FUEL"));
    }
}
