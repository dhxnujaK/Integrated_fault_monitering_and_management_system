package com.faultmonitor.backend.ml;

import com.faultmonitor.backend.entity.SubsystemType;
import java.util.Map;

public record MlPredictionRequest(
        Long equipmentId,
        String equipmentCode,
        SubsystemType equipmentType,
        Map<String, Object> readings
) {
}
