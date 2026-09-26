package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.entity.TicketPriority;
import com.faultmonitor.backend.entity.TicketStatus;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

public record TicketResponse(
        Long id,
        Long equipmentId,
        String equipmentCode,
        SubsystemType equipmentType,
        String title,
        String description,
        TicketStatus status,
        TicketPriority priority,
        Long alarmId,
        Long predictionId,
        Long createdBy,
        String createdByUsername,
        Instant createdAt,
        Instant updatedAt
) {
    public static TicketResponse from(MaintenanceTicket ticket) {
        return from(ticket, null);
    }

    public static TicketResponse from(MaintenanceTicket ticket, String createdByUsername) {
        return new TicketResponse(
                ticket.getId(),
                ticket.getEquipment() == null ? null : ticket.getEquipment().getId(),
                ticket.getEquipment() == null ? ticket.getSubsystemId() : ticket.getEquipment().getEquipmentCode(),
                ticket.getSubsystemType(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getPriority(),
                ticket.getAlarmId(),
                ticket.getPredictionId(),
                ticket.getCreatedBy(),
                createdByUsername,
                toInstant(ticket.getCreatedAt()),
                toInstant(ticket.getUpdatedAt())
        );
    }

    private static Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneId.systemDefault()).toInstant();
    }
}
