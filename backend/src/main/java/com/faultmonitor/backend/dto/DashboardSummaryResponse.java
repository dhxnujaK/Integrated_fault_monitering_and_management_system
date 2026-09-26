package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.SubsystemType;
import java.time.Instant;
import java.util.List;

public record DashboardSummaryResponse(
        List<EquipmentSummary> equipment,
        AlarmTotals alarmTotals
) {
    public record EquipmentSummary(
            Long equipmentId,
            String equipmentCode,
            SubsystemType equipmentType,
            String displayName,
            String overallStatus,
            Instant recordedAt,
            long unresolvedAlarmCount
    ) {
    }

    public record AlarmTotals(
            long active,
            long acknowledged,
            long criticalUnresolved,
            long warningUnresolved
    ) {
    }
}
