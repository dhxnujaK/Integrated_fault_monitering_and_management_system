package com.faultmonitor.backend.controller;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.faultmonitor.backend.dto.MlHealthResponse;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.PredictionRepository;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@AutoConfigureMockMvc
@Transactional
class PredictionControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private PredictionRepository predictionRepository;

    @MockBean
    private MlClient mlClient;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        predictionRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
        predictionRepository.saveAndFlush(Prediction.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .failureProbability(0.72)
                .predictedFailureType("GEN_LOW_FUEL")
                .recommendedActions("[\"Refill the day tank\"]")
                .confidence(0.81)
                .modelVersion("test-v1")
                .build());
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void latestPredictionsReturnPersistedContract() throws Exception {
        mockMvc.perform(get("/api/predictions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].equipmentCode").value("GENERATOR-01"))
                .andExpect(jsonPath("$[0].failureProbability").value(0.72))
                .andExpect(jsonPath("$[0].modelVersion").value("test-v1"))
                .andExpect(jsonPath("$[0].diagnosis.key").value("GEN_LOW_FUEL"));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void historyEndpointReturnsPageContract() throws Exception {
        mockMvc.perform(get("/api/equipment/{id}/predictions", generator.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].equipmentId").value(generator.getId()))
                .andExpect(jsonPath("$.totalItems").value(1));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void mlHealthEndpointReturnsBackendProxyStatus() throws Exception {
        when(mlClient.health()).thenReturn(new MlHealthResponse(
                "ok", "http://localhost:8000", true, Map.of("status", "ok"), Instant.now()));

        mockMvc.perform(get("/api/predictions/ml-health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reachable").value(true));
    }

    @Test
    @WithMockUser(roles = "OPERATOR")
    void manualRunEndpointIsAvailableToOperators() throws Exception {
        mockMvc.perform(post("/api/predictions/run").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedCount").isNumber());
    }
}
