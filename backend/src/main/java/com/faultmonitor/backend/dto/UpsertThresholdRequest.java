package com.faultmonitor.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request body for creating or updating a threshold override.
 *
 * @param metricKey the metric identifier (e.g. "GENERATOR_LOW_FUEL")
 * @param value     the new threshold value
 */
public record UpsertThresholdRequest(
        @NotBlank @Size(max = 100)
        String metricKey,

        @NotNull
        Double value) {
}
