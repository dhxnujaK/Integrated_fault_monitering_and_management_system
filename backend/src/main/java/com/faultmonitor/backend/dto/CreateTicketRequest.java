package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTicketRequest(
        @NotNull(message = "equipmentId is required")
        Long equipmentId,

        @NotBlank(message = "title is required")
        @Size(max = 200, message = "title must not exceed 200 characters")
        String title,

        @Size(max = 2000, message = "description must not exceed 2000 characters")
        String description,

        TicketPriority priority,

        Long alarmId,

        Long predictionId
) {
}
