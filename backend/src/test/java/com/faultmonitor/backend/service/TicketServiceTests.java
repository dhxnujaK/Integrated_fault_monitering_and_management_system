package com.faultmonitor.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.faultmonitor.backend.dto.CreateTicketRequest;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.TicketResponse;
import com.faultmonitor.backend.dto.UpdateTicketRequest;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.Role;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.entity.TicketPriority;
import com.faultmonitor.backend.entity.TicketStatus;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.MaintenanceTicketRepository;
import com.faultmonitor.backend.repository.PredictionRepository;
import com.faultmonitor.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@Transactional
class TicketServiceTests {

        @Autowired
        private TicketService ticketService;

        @Autowired
        private MaintenanceTicketRepository ticketRepository;

        @Autowired
        private EquipmentRepository equipmentRepository;

        @Autowired
        private AlarmRepository alarmRepository;

        @Autowired
        private PredictionRepository predictionRepository;

        @Autowired
        private UserRepository userRepository;

        private Equipment generator;
        private Equipment ats;
        private User testUser;

        @BeforeEach
        void setUp() {
                ticketRepository.deleteAll();
                generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
                ats = equipmentRepository.findByEquipmentCode("ATS-01").orElseThrow();

                testUser = userRepository.findByUsername("admin").orElseGet(() -> userRepository.save(User.builder()
                                .username("admin")
                                .passwordHash("hashed")
                                .role(Role.ADMIN)
                                .enabled(true)
                                .build()));
        }

        @Test
        void createTicketSuccessfullyPersistsAndDefaultsToOpen() {
                CreateTicketRequest request = new CreateTicketRequest(
                                generator.getId(),
                                "Check engine oil leak",
                                "Observed minor oil weeping during routine run.",
                                TicketPriority.HIGH,
                                null,
                                null);

                TicketResponse response = ticketService.createTicket(request, testUser.getUsername());

                assertThat(response.id()).isNotNull();
                assertThat(response.equipmentId()).isEqualTo(generator.getId());
                assertThat(response.equipmentCode()).isEqualTo(generator.getEquipmentCode());
                assertThat(response.equipmentType()).isEqualTo(SubsystemType.GENERATOR);
                assertThat(response.title()).isEqualTo("Check engine oil leak");
                assertThat(response.status()).isEqualTo(TicketStatus.OPEN);
                assertThat(response.priority()).isEqualTo(TicketPriority.HIGH);
                assertThat(response.createdByUsername()).isEqualTo(testUser.getUsername());
                assertThat(response.createdAt()).isNotNull();
        }

        @Test
        void createTicketWithValidLinkedAlarmAndPrediction() {
                Alarm alarm = alarmRepository.save(Alarm.builder()
                                .equipment(generator)
                                .subsystemType(generator.getEquipmentType())
                                .subsystemId(generator.getEquipmentCode())
                                .alarmCode("GEN_HIGH_TEMP")
                                .alarmMessage("Coolant temperature high")
                                .severity(AlarmSeverity.WARNING)
                                .status(AlarmStatus.ACTIVE)
                                .build());

                Prediction prediction = predictionRepository.save(Prediction.builder()
                                .equipment(generator)
                                .subsystemType(generator.getEquipmentType())
                                .subsystemId(generator.getEquipmentCode())
                                .failureProbability(0.85)
                                .predictedFailureType("GEN_OVERHEAT")
                                .recommendedActions("[\"Inspect radiator\"]")
                                .confidence(0.9)
                                .modelVersion("v1")
                                .build());

                CreateTicketRequest request = new CreateTicketRequest(
                                generator.getId(),
                                "Overheating alert inspection",
                                "Investigating coolant temp spike",
                                TicketPriority.HIGH,
                                alarm.getId(),
                                prediction.getId());

                TicketResponse response = ticketService.createTicket(request, testUser.getUsername());

                assertThat(response.alarmId()).isEqualTo(alarm.getId());
                assertThat(response.predictionId()).isEqualTo(prediction.getId());
        }

        @Test
        void createTicketWithMismatchedAlarmThrowsBadRequest() {
                Alarm atsAlarm = alarmRepository.save(Alarm.builder()
                                .equipment(ats)
                                .subsystemType(ats.getEquipmentType())
                                .subsystemId(ats.getEquipmentCode())
                                .alarmCode("ATS_TRANSFER_FAIL")
                                .alarmMessage("Transfer failed")
                                .severity(AlarmSeverity.CRITICAL)
                                .status(AlarmStatus.ACTIVE)
                                .build());

                CreateTicketRequest request = new CreateTicketRequest(
                                generator.getId(), // Creating ticket for GENERATOR-01
                                "Cross equipment test",
                                "Should fail because alarm is on ATS-01",
                                TicketPriority.HIGH,
                                atsAlarm.getId(), // Alarm belongs to ATS-01
                                null);

                assertThatThrownBy(() -> ticketService.createTicket(request, testUser.getUsername()))
                                .isInstanceOf(ApiException.class)
                                .satisfies(ex -> {
                                        ApiException apiEx = (ApiException) ex;
                                        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                                        assertThat(apiEx.getCode()).isEqualTo("EQUIPMENT_MISMATCH");
                                });
        }

        @Test
        void createTicketWithMismatchedPredictionThrowsBadRequest() {
                Prediction atsPrediction = predictionRepository.save(Prediction.builder()
                                .equipment(ats)
                                .subsystemType(ats.getEquipmentType())
                                .subsystemId(ats.getEquipmentCode())
                                .failureProbability(0.7)
                                .predictedFailureType("ATS_FAULT")
                                .confidence(0.8)
                                .modelVersion("v1")
                                .build());

                CreateTicketRequest request = new CreateTicketRequest(
                                generator.getId(), // Creating ticket for GENERATOR-01
                                "Cross equipment test",
                                "Should fail because prediction is on ATS-01",
                                TicketPriority.MEDIUM,
                                null,
                                atsPrediction.getId() // Prediction is on ATS-01
                );

                assertThatThrownBy(() -> ticketService.createTicket(request, testUser.getUsername()))
                                .isInstanceOf(ApiException.class)
                                .satisfies(ex -> {
                                        ApiException apiEx = (ApiException) ex;
                                        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                                        assertThat(apiEx.getCode()).isEqualTo("EQUIPMENT_MISMATCH");
                                });
        }

        @Test
        void permittedStatusTransitionsSucceed() {
                TicketResponse ticket = ticketService.createTicket(
                                new CreateTicketRequest(generator.getId(), "Lifecycle test", "Desc", TicketPriority.LOW,
                                                null, null),
                                testUser.getUsername());

                // OPEN -> IN_PROGRESS
                TicketResponse inProgress = ticketService.updateTicket(ticket.id(),
                                new UpdateTicketRequest(TicketStatus.IN_PROGRESS, null, "Investigation started"));
                assertThat(inProgress.status()).isEqualTo(TicketStatus.IN_PROGRESS);
                assertThat(inProgress.description()).isEqualTo("Investigation started");

                // IN_PROGRESS -> CLOSED
                TicketResponse closed = ticketService.updateTicket(ticket.id(),
                                new UpdateTicketRequest(TicketStatus.CLOSED, null, "Resolved and tested"));
                assertThat(closed.status()).isEqualTo(TicketStatus.CLOSED);
                assertThat(closed.description()).isEqualTo("Resolved and tested");
        }

        @Test
        void invalidDirectTransitionFromOpenToClosedThrowsBadRequest() {
                TicketResponse ticket = ticketService.createTicket(
                                new CreateTicketRequest(generator.getId(), "Jump transition test", "Desc",
                                                TicketPriority.LOW, null, null),
                                testUser.getUsername());

                // Direct OPEN -> CLOSED is forbidden (must go through IN_PROGRESS)
                assertThatThrownBy(() -> ticketService.updateTicket(ticket.id(),
                                new UpdateTicketRequest(TicketStatus.CLOSED, null, "Skip to closed")))
                                .isInstanceOf(ApiException.class)
                                .satisfies(ex -> {
                                        ApiException apiEx = (ApiException) ex;
                                        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                                        assertThat(apiEx.getCode()).isEqualTo("INVALID_TRANSITION");
                                });
        }

        @Test
        void reopeningClosedTicketThrowsBadRequest() {
                TicketResponse ticket = ticketService.createTicket(
                                new CreateTicketRequest(generator.getId(), "Close and reopen test", "Desc",
                                                TicketPriority.LOW, null, null),
                                testUser.getUsername());
                ticketService.updateTicket(ticket.id(), new UpdateTicketRequest(TicketStatus.IN_PROGRESS, null, null));
                ticketService.updateTicket(ticket.id(), new UpdateTicketRequest(TicketStatus.CLOSED, null, null));

                // Reopening from CLOSED is forbidden
                assertThatThrownBy(() -> ticketService.updateTicket(ticket.id(),
                                new UpdateTicketRequest(TicketStatus.OPEN, null, "Reopen")))
                                .isInstanceOf(ApiException.class)
                                .satisfies(ex -> {
                                        ApiException apiEx = (ApiException) ex;
                                        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                                        assertThat(apiEx.getCode()).isEqualTo("INVALID_TRANSITION");
                                });
        }

        @Test
        void findAllSupportsFilteringAndPagination() {
                ticketService.createTicket(
                                new CreateTicketRequest(generator.getId(), "Gen Ticket 1", "Desc", TicketPriority.LOW,
                                                null, null),
                                testUser.getUsername());
                TicketResponse genTicket2 = ticketService.createTicket(
                                new CreateTicketRequest(generator.getId(), "Gen Ticket 2", "Desc", TicketPriority.HIGH,
                                                null, null),
                                testUser.getUsername());
                ticketService.updateTicket(genTicket2.id(),
                                new UpdateTicketRequest(TicketStatus.IN_PROGRESS, null, null));

                ticketService.createTicket(
                                new CreateTicketRequest(ats.getId(), "ATS Ticket 1", "Desc", TicketPriority.MEDIUM,
                                                null, null),
                                testUser.getUsername());

                // Filter by equipmentId
                PageResponse<TicketResponse> genTickets = ticketService.findAll(null, null, generator.getId(), 0, 10);
                assertThat(genTickets.totalItems()).isEqualTo(2);

                // Filter by status IN_PROGRESS
                PageResponse<TicketResponse> inProgressTickets = ticketService.findAll(TicketStatus.IN_PROGRESS, null,
                                null, 0, 10);
                assertThat(inProgressTickets.totalItems()).isEqualTo(1);
                assertThat(inProgressTickets.items().get(0).title()).isEqualTo("Gen Ticket 2");
        }
}
