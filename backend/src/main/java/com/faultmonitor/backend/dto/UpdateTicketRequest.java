package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.TicketPriority;
import com.faultmonitor.backend.entity.TicketStatus;
import jakarta.validation.constraints.Size;

public record UpdateTicketRequest(
        TicketStatus status,
        TicketPriority priority,
        @Size(max = 2000, message = "description must not exceed 2000 characters")
        String description
) {
}
