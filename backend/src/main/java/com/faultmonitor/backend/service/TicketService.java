package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.CreateTicketRequest;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.TicketResponse;
import com.faultmonitor.backend.dto.UpdateTicketRequest;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.Prediction;
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
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final MaintenanceTicketRepository ticketRepository;
    private final EquipmentRepository equipmentRepository;
    private final AlarmRepository alarmRepository;
    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;

    @Transactional
    public TicketResponse createTicket(CreateTicketRequest request, String currentUsername) {
        User creator = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND",
                        "Authenticated user not found: " + currentUsername));

        Equipment equipment = equipmentRepository.findById(request.equipmentId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EQUIPMENT_NOT_FOUND",
                        "Equipment not found with id: " + request.equipmentId()));

        if (request.alarmId() != null) {
            Alarm alarm = alarmRepository.findById(request.alarmId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ALARM_NOT_FOUND",
                            "Alarm not found with id: " + request.alarmId()));
            Long alarmEquipmentId = alarm.getEquipment() != null ? alarm.getEquipment().getId() : null;
            if (alarmEquipmentId != null && !alarmEquipmentId.equals(equipment.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "EQUIPMENT_MISMATCH",
                        "Linked alarm " + request.alarmId() + " does not belong to equipment " + equipment.getId());
            }
        }

        if (request.predictionId() != null) {
            Prediction prediction = predictionRepository.findById(request.predictionId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PREDICTION_NOT_FOUND",
                            "Prediction not found with id: " + request.predictionId()));
            Long predictionEquipmentId = prediction.getEquipment() != null ? prediction.getEquipment().getId() : null;
            if (predictionEquipmentId != null && !predictionEquipmentId.equals(equipment.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "EQUIPMENT_MISMATCH",
                        "Linked prediction " + request.predictionId() + " does not belong to equipment " + equipment.getId());
            }
        }

        MaintenanceTicket ticket = MaintenanceTicket.builder()
                .equipment(equipment)
                .subsystemType(equipment.getEquipmentType())
                .subsystemId(equipment.getEquipmentCode())
                .title(request.title().trim())
                .description(request.description())
                .status(TicketStatus.OPEN)
                .priority(request.priority() != null ? request.priority() : TicketPriority.MEDIUM)
                .alarmId(request.alarmId())
                .predictionId(request.predictionId())
                .createdBy(creator.getId())
                .build();

        MaintenanceTicket saved = ticketRepository.save(ticket);
        return TicketResponse.from(saved, creator.getUsername());
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketById(Long id) {
        MaintenanceTicket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND",
                        "Maintenance ticket not found with id: " + id));

        String creatorUsername = userRepository.findById(ticket.getCreatedBy())
                .map(User::getUsername)
                .orElse("unknown");

        return TicketResponse.from(ticket, creatorUsername);
    }

    @Transactional(readOnly = true)
    public PageResponse<TicketResponse> findAll(
            TicketStatus status,
            SubsystemType equipmentType,
            Long equipmentId,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        Page<MaintenanceTicket> ticketPage = ticketRepository.findFiltered(status, equipmentType, equipmentId, pageable);

        Set<Long> userIds = ticketPage.getContent().stream()
                .map(MaintenanceTicket::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> usernameMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));

        Page<TicketResponse> responsePage = ticketPage.map(ticket ->
                TicketResponse.from(ticket, usernameMap.getOrDefault(ticket.getCreatedBy(), "unknown")));

        return PageResponse.from(responsePage);
    }

    @Transactional
    public TicketResponse updateTicket(Long ticketId, UpdateTicketRequest request) {
        MaintenanceTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "TICKET_NOT_FOUND",
                        "Maintenance ticket not found with id: " + ticketId));

        if (request.status() != null && request.status() != ticket.getStatus()) {
            validateStatusTransition(ticket.getStatus(), request.status());
            ticket.setStatus(request.status());
        }

        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }

        if (request.description() != null) {
            ticket.setDescription(request.description());
        }

        MaintenanceTicket updated = ticketRepository.save(ticket);
        String creatorUsername = userRepository.findById(updated.getCreatedBy())
                .map(User::getUsername)
                .orElse("unknown");

        return TicketResponse.from(updated, creatorUsername);
    }

    private void validateStatusTransition(TicketStatus current, TicketStatus target) {
        if (current == TicketStatus.OPEN && target == TicketStatus.IN_PROGRESS) {
            return;
        }
        if (current == TicketStatus.IN_PROGRESS && target == TicketStatus.CLOSED) {
            return;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_TRANSITION",
                "Invalid ticket status transition from " + current + " to " + target
                        + ". Permitted transitions are OPEN -> IN_PROGRESS -> CLOSED.");
    }
}
