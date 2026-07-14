package com.faultmonitor.backend.dto;

import jakarta.validation.constraints.Size;

public record AcknowledgeAlarmRequest(
        @Size(max = 500, message = "Acknowledgement note must not exceed 500 characters.")
        String note
) {
}
