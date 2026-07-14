package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.SubsystemType;
import java.time.Instant;
import java.util.Map;

public record EquipmentStatusResponse(
        Long equipmentId,
        String equipmentCode,
        SubsystemType equipmentType,
        String displayName,
        Instant recordedAt,
        String overallStatus,
        long activeAlarmCount,
        long acknowledgedAlarmCount,
        Map<String, Object> latestReading
) {
}
