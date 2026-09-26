package com.faultmonitor.backend.dto;

import java.util.List;

public record DiagnosisResponse(
        String key,
        String kind,
        String observablePattern,
        List<String> probableCauses,
        List<DiagnosisActionResponse> correctiveActions,
        String sourceFailureType,
        boolean predictable
) {
}
