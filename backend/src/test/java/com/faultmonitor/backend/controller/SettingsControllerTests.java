package com.faultmonitor.backend.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
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
class SettingsControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EquipmentRepository equipmentRepository;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void getThresholdsReturnsCatalogueAndEquipmentOverrides() throws Exception {
        mockMvc.perform(get("/api/equipment/{equipmentId}/thresholds", generator.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].metricKey").value("GENERATOR_LOW_FUEL"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCanUpsertThresholdAndDeleteIt() throws Exception {
        Map<String, Object> payload = Map.of("metricKey", "GENERATOR_LOW_FUEL", "value", 18.5);

        mockMvc.perform(put("/api/equipment/{equipmentId}/thresholds/{metricKey}", generator.getId(), "GENERATOR_LOW_FUEL")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metricKey").value("GENERATOR_LOW_FUEL"))
                .andExpect(jsonPath("$.value").value(18.5));

        mockMvc.perform(delete("/api/equipment/{equipmentId}/thresholds/{metricKey}", generator.getId(), "GENERATOR_LOW_FUEL")
                        .with(csrf()))
                .andExpect(status().isNoContent());
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void operatorIsDeniedThresholdWriteAccess() throws Exception {
        Map<String, Object> payload = Map.of("metricKey", "GENERATOR_LOW_FUEL", "value", 18.5);

        mockMvc.perform(put("/api/equipment/{equipmentId}/thresholds/{metricKey}", generator.getId(), "GENERATOR_LOW_FUEL")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isForbidden());
    }
}
