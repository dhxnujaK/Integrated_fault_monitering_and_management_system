package com.faultmonitor.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateEquipmentRequest(
        @NotBlank(message = "Display name is required.")
        @Size(max = 120, message = "Display name must not exceed 120 characters.")
        String displayName,
        @NotBlank(message = "Location is required.")
        @Size(max = 200, message = "Location must not exceed 200 characters.")
        String location,
        @Size(max = 500, message = "Description must not exceed 500 characters.")
        String description
) {
}
