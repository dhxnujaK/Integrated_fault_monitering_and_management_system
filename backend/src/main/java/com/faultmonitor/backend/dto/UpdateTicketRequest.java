package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.TicketPriority;
import com.faultmonitor.backend.entity.TicketStatus;
import jakarta.validation.constraints.Size;

public record UpdateTicketRequest(
        TicketStatus status,
        TicketPriority priority,
        @Size(max = 100, message = "assignedGroup must not exceed 100 characters")
        String assignedGroup,
        @Size(max = 2000, message = "description must not exceed 2000 characters")
        String description
) {
}
