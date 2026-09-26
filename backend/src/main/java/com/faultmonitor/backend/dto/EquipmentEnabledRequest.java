package com.faultmonitor.backend.dto;

import jakarta.validation.constraints.NotNull;

public record EquipmentEnabledRequest(
        @NotNull(message = "Enabled state is required.") Boolean enabled
) {
}
