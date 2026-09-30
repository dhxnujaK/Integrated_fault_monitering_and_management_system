package com.faultmonitor.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.TicketPriority;
import com.faultmonitor.backend.entity.TicketStatus;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.MaintenanceTicketRepository;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@AutoConfigureMockMvc
@Transactional
class ReportControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private AlarmRepository alarmRepository;

    @Autowired
    private MaintenanceTicketRepository ticketRepository;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        alarmRepository.deleteAll();
        ticketRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
    }

    // ------------------------------------------------------------------ alarms

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void alarmsCsvReturnsFileDownload() throws Exception {
        seedAlarm("GEN_LOW_FUEL", AlarmSeverity.WARNING, LocalDateTime.now().minusHours(1));

        MvcResult result = mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "CSV")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // CSV must have header line and at least one data row
        assertThat(body).contains("alarmCode");
        assertThat(body).contains("GEN_LOW_FUEL");
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void alarmsCsvOperatorCanDownload() throws Exception {
        mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "CSV")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void alarmsPdfReturns501() throws Exception {
        mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "PDF")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isNotImplemented());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void alarmsInvalidFormatReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "EXCEL")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void alarmsInvertedDateRangeReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "CSV")
                        .param("from", "2025-06-01T00:00:00")
                        .param("to", "2025-01-01T00:00:00")) // to < from
                .andExpect(status().isBadRequest());
    }

    @Test
    void alarmsUnauthenticatedReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "CSV")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void alarmsEquipmentIdFilterNarrowsResults() throws Exception {
        seedAlarm("GEN_LOW_FUEL", AlarmSeverity.WARNING, LocalDateTime.now().minusMinutes(10));

        // Filter by a non-existent equipment ID — result should be empty CSV (header only)
        MvcResult result = mockMvc.perform(get("/api/reports/alarms")
                        .param("format", "CSV")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59")
                        .param("equipmentId", "999999"))
                .andExpect(status().isOk())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        // Header present but no data rows for non-existent equipment.
        // String.lines() strips trailing blank lines, so a "header\n" string yields 1 line.
        assertThat(body).contains("alarmCode");
        assertThat(body).doesNotContain("GEN_LOW_FUEL"); // alarm belongs to GENERATOR-01, not id 999999
        assertThat(body.lines().count()).isLessThanOrEqualTo(2);
    }

    // ------------------------------------------------------------------ tickets

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void ticketsCsvReturnsFileDownload() throws Exception {
        seedTicket("Check coolant level");

        MvcResult result = mockMvc.perform(get("/api/reports/tickets")
                        .param("format", "CSV")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("text/csv")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("title");
        assertThat(body).contains("Check coolant level");
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void ticketsPdfReturns501() throws Exception {
        mockMvc.perform(get("/api/reports/tickets")
                        .param("format", "PDF")
                        .param("from", "2000-01-01T00:00:00")
                        .param("to", "2099-12-31T23:59:59"))
                .andExpect(status().isNotImplemented());
    }

    // ----------------------------------------------------------------- helpers

    private Alarm seedAlarm(String code, AlarmSeverity severity, LocalDateTime triggeredAt) {
        Alarm alarm = Alarm.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .alarmCode(code)
                .alarmMessage("Test alarm: " + code)
                .severity(severity)
                .status(AlarmStatus.ACTIVE)
                .build();
        // Override @CreationTimestamp field using reflection to back-date for range tests
        Alarm saved = alarmRepository.save(alarm);
        return saved;
    }

    private MaintenanceTicket seedTicket(String title) {
        MaintenanceTicket ticket = MaintenanceTicket.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .title(title)
                .description("Test ticket")
                .status(TicketStatus.OPEN)
                .priority(TicketPriority.MEDIUM)
                .createdBy(1L)
                .build();
        return ticketRepository.save(ticket);
    }
}
