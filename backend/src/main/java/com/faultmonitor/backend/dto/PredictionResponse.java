package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.SubsystemType;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

public record PredictionResponse(
        Long id,
        Long equipmentId,
        String equipmentCode,
        SubsystemType equipmentType,
        Double failureProbability,
        String predictedFailureType,
        List<String> recommendedActions,
        Double confidence,
        String modelVersion,
        Instant predictedAt
) {
    public static PredictionResponse from(Prediction prediction, List<String> recommendedActions) {
        return new PredictionResponse(
                prediction.getId(),
                prediction.getEquipment() == null ? null : prediction.getEquipment().getId(),
                prediction.getEquipment() == null ? prediction.getSubsystemId() : prediction.getEquipment().getEquipmentCode(),
                prediction.getSubsystemType(),
                prediction.getFailureProbability(),
                prediction.getPredictedFailureType(),
                recommendedActions,
                prediction.getConfidence(),
                prediction.getModelVersion(),
                toInstant(prediction.getPredictedAt()));
    }

    private static Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneId.systemDefault()).toInstant();
    }
}
