package com.faultmonitor.backend.dto;

public record PredictionSummaryResponse(
        long total,
        long highRisk,
        long mediumRisk,
        long lowRisk
) {
}
