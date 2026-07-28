package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.SubsystemType;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

public record AlarmResponse(
        Long id,
        Long equipmentId,
        String equipmentCode,
        SubsystemType equipmentType,
        String alarmCode,
        String alarmMessage,
        AlarmSeverity severity,
        AlarmStatus status,
        Instant triggeredAt,
        Instant acknowledgedAt,
        AcknowledgedUser acknowledgedBy,
        String acknowledgementNote,
        Instant resolvedAt,
        DiagnosisResponse diagnosis
) {
    public static AlarmResponse from(Alarm alarm) {
        return from(alarm, null);
    }

    public static AlarmResponse from(Alarm alarm, DiagnosisResponse diagnosis) {
        return new AlarmResponse(
                alarm.getId(),
                alarm.getEquipment() == null ? null : alarm.getEquipment().getId(),
                alarm.getEquipment() == null ? alarm.getSubsystemId() : alarm.getEquipment().getEquipmentCode(),
                alarm.getSubsystemType(),
                alarm.getAlarmCode(),
                alarm.getAlarmMessage(),
                alarm.getSeverity(),
                alarm.getStatus(),
                toInstant(alarm.getTriggeredAt()),
                toInstant(alarm.getAcknowledgedAt()),
                alarm.getAcknowledgedBy() == null ? null : new AcknowledgedUser(
                        alarm.getAcknowledgedBy().getId(), alarm.getAcknowledgedBy().getUsername()),
                alarm.getAcknowledgementNote(),
                toInstant(alarm.getResolvedAt()),
                diagnosis);
    }

    private static Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneId.systemDefault()).toInstant();
    }

    public record AcknowledgedUser(Long id, String username) {
    }
}
