package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.SubsystemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateEquipmentRequest(
        @NotBlank(message = "Equipment code is required.")
        @Size(max = 50, message = "Equipment code must not exceed 50 characters.")
        String equipmentCode,
        @NotNull(message = "Equipment type is required.")
        SubsystemType equipmentType,
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
