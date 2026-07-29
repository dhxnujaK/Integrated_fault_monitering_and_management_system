package com.faultmonitor.backend.dto;

public record EquipmentDiagnosisResponse(
        AlarmResponse alarm,
        DiagnosisResponse diagnosis
) {
}
