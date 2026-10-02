package com.faultmonitor.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.MaintenanceTicketRepository;
import com.faultmonitor.backend.repository.PredictionRepository;
import com.faultmonitor.backend.service.AlarmService;
import java.util.List;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@AutoConfigureMockMvc
@Transactional
class Day9EndToEndFixtureTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private PredictionRepository predictionRepository;

    @Autowired
    private MaintenanceTicketRepository ticketRepository;

    @MockBean
    private MlClient mlClient;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        ticketRepository.deleteAll();
        predictionRepository.deleteAll();
        alarmRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void day9FixtureCoversFaultDiagnosisPredictionTicketReportAndMlOutage() throws Exception {
        alarmService.checkGenerator(generator, Map.of(
                "fuel_level_pct", 8.0,
                "running_status", "RUNNING",
                "room_temperature_c", 30.0));

        Alarm alarm = alarmRepository.findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
                        generator.getId(), List.of(AlarmStatus.ACTIVE))
                .stream()
                .filter(record -> "GEN_LOW_FUEL".equals(record.getAlarmCode()))
                .findFirst()
                .orElseThrow();

        mockMvc.perform(get("/api/equipment/{equipmentId}/diagnosis", generator.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].diagnosis.probableCauses").isArray())
                .andExpect(jsonPath("$[0].diagnosis.correctiveActions[0].step").isNumber());

        Prediction prediction = predictionRepository.saveAndFlush(Prediction.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .failureProbability(0.88)
                .predictedFailureType("GEN_LOW_FUEL")
                .recommendedActions("[\"Refill the day tank\"]")
                .confidence(0.88)
                .modelVersion("fixture-v1")
                .estimatedTimeToFailureMinutes(45)
                .build());

        mockMvc.perform(get("/api/predictions/latest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].modelVersion").value("fixture-v1"))
                .andExpect(jsonPath("$[0].estimatedTimeToFailureMinutes").value(45));

        MvcResult createdTicket = mockMvc.perform(post("/api/tickets").with(csrf())
                        .contentType("application/json")
                        .content("""
                                {
                                  "equipmentId": %d,
                                  "title": "Investigate generator low fuel",
                                  "description": "Created by Day 9 fixture",
                                  "priority": "HIGH",
                                  "alarmId": %d,
                                  "predictionId": %d
                                }
                                """.formatted(generator.getId(), alarm.getId(), prediction.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alarmId").value(alarm.getId()))
                .andExpect(jsonPath("$.predictionId").value(prediction.getId()))
                .andReturn();
        Long ticketId = readId(createdTicket);

        mockMvc.perform(put("/api/tickets/{ticketId}", ticketId).with(csrf())
                        .contentType("application/json")
                        .content("{\"status\":\"IN_PROGRESS\",\"description\":\"Investigation started\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        mockMvc.perform(put("/api/tickets/{ticketId}", ticketId).with(csrf())
                        .contentType("application/json")
                        .content("{\"status\":\"CLOSED\",\"description\":\"Fuel restored\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        mockMvc.perform(get("/api/reports/tickets")
                        .param("format", "CSV")
                        .param("from", "2026-01-01T00:00:00")
                        .param("to", "2030-01-01T00:00:00")
                        .param("equipmentId", String.valueOf(generator.getId())))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Investigate generator low fuel")));

        alarmService.checkGenerator(generator, Map.of(
                "fuel_level_pct", 55.0,
                "running_status", "RUNNING",
                "room_temperature_c", 30.0));
        mockMvc.perform(get("/api/alarms").param("status", "RESOLVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].status").value("RESOLVED"));

        when(mlClient.predict(any())).thenThrow(new RestClientException("ML service stopped"));
        mockMvc.perform(post("/api/predictions/run").with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.savedCount").isNumber());
        mockMvc.perform(get("/api/equipment/{equipmentId}/diagnosis", generator.getId()))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/tickets"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "CSV")
                        .param("from", "2026-01-01T00:00:00")
                        .param("to", "2030-01-01T00:00:00"))
                .andExpect(status().isOk());
    }

    private Long readId(MvcResult result) throws Exception {
        JsonNode json = objectMapper.readTree(result.getResponse().getContentAsString());
        return json.get("id").asLong();
    }
}
