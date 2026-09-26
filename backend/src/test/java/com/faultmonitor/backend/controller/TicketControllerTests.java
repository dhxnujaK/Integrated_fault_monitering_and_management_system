package com.faultmonitor.backend.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.faultmonitor.backend.dto.CreateTicketRequest;
import com.faultmonitor.backend.dto.TicketResponse;
import com.faultmonitor.backend.dto.UpdateTicketRequest;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.TicketPriority;
import com.faultmonitor.backend.entity.TicketStatus;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.MaintenanceTicketRepository;
import com.faultmonitor.backend.service.TicketService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
class TicketControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private MaintenanceTicketRepository ticketRepository;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        ticketRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void createTicketReturnsCreatedAndLocationHeader() throws Exception {
        CreateTicketRequest request = new CreateTicketRequest(
                generator.getId(),
                "Fix generator coolant leak",
                "Coolant leak observed at pump fitting",
                TicketPriority.HIGH,
                null,
                null
        );

        mockMvc.perform(post("/api/tickets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value("Fix generator coolant leak"))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.equipmentCode").value("GENERATOR-01"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void findAllReturnsPageResponse() throws Exception {
        ticketService.createTicket(
                new CreateTicketRequest(generator.getId(), "Ticket 1", "Desc 1", TicketPriority.LOW, null, null),
                "admin"
        );

        mockMvc.perform(get("/api/tickets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalItems").value(1))
                .andExpect(jsonPath("$.items[0].title").value("Ticket 1"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void findByIdReturnsTicketDetails() throws Exception {
        TicketResponse created = ticketService.createTicket(
                new CreateTicketRequest(generator.getId(), "Ticket Detail", "Detail Desc", TicketPriority.MEDIUM, null, null),
                "admin"
        );

        mockMvc.perform(get("/api/tickets/{id}", created.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(created.id()))
                .andExpect(jsonPath("$.title").value("Ticket Detail"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void updateTicketTransitionsStatus() throws Exception {
        TicketResponse created = ticketService.createTicket(
                new CreateTicketRequest(generator.getId(), "Ticket Update", "Initial Desc", TicketPriority.LOW, null, null),
                "admin"
        );

        UpdateTicketRequest updateRequest = new UpdateTicketRequest(
                TicketStatus.IN_PROGRESS,
                TicketPriority.HIGH,
                "Technician dispatched"
        );

        mockMvc.perform(put("/api/tickets/{id}", created.id())
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"))
                .andExpect(jsonPath("$.priority").value("HIGH"))
                .andExpect(jsonPath("$.description").value("Technician dispatched"));
    }

    @Test
    void unauthenticatedRequestReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/tickets"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "admin", roles = "OPERATOR")
    void invalidCreateRequestReturnsBadRequest() throws Exception {
        CreateTicketRequest invalid = new CreateTicketRequest(
                null, // Missing required equipmentId
                "",   // Blank title
                null,
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/tickets")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
