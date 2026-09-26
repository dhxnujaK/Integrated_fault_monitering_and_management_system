package com.faultmonitor.backend.ml;

import java.util.List;

public record MlPredictionResult(
        Double failureProbability,
        String predictedFailureType,
        List<String> recommendedActions,
        Double confidence,
        String modelVersion
) {
}
