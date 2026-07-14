package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.dto.DashboardSummaryResponse;
import com.faultmonitor.backend.dto.EquipmentStatusResponse;
import com.faultmonitor.backend.dto.ReadingResponse;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MonitoringService {

    private static final long OFFLINE_TIMEOUT_SECONDS = 30;
    private static final TypeReference<Map<String, Object>> READING_TYPE = new TypeReference<>() { };

    private final EquipmentRepository equipmentRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final AlarmRepository alarmRepository;
    private final EquipmentService equipmentService;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public EquipmentStatusResponse status(Long equipmentId) {
        Equipment equipment = equipmentService.requireEquipment(equipmentId);
        SensorReading reading = sensorReadingRepository
                .findFirstByEquipmentIdOrderByRecordedAtDesc(equipmentId).orElse(null);
        AlarmCounts counts = alarmCounts(equipmentId);
        return new EquipmentStatusResponse(
                equipment.getId(), equipment.getEquipmentCode(), equipment.getEquipmentType(),
                equipment.getDisplayName(), toInstant(reading == null ? null : reading.getRecordedAt()),
                overallStatus(reading, counts), counts.active(), counts.acknowledged(),
                reading == null ? Map.of() : parseData(reading));
    }

    @Transactional(readOnly = true)
    public List<ReadingResponse> readings(Long equipmentId, int limit) {
        equipmentService.requireEquipment(equipmentId);
        return sensorReadingRepository
                .findByEquipmentIdOrderByRecordedAtDesc(equipmentId, PageRequest.of(0, limit))
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DashboardSummaryResponse dashboardSummary() {
        List<DashboardSummaryResponse.EquipmentSummary> equipment = equipmentRepository
                .findByEnabledTrueOrderByEquipmentCodeAsc().stream()
                .map(this::summaryFor).toList();
        DashboardSummaryResponse.AlarmTotals totals = new DashboardSummaryResponse.AlarmTotals(
                alarmRepository.countByStatus(AlarmStatus.ACTIVE),
                alarmRepository.countByStatus(AlarmStatus.ACKNOWLEDGED),
                alarmRepository.countUnresolvedBySeverity(AlarmSeverity.CRITICAL, AlarmStatus.RESOLVED),
                alarmRepository.countUnresolvedBySeverity(AlarmSeverity.WARNING, AlarmStatus.RESOLVED));
        return new DashboardSummaryResponse(equipment, totals);
    }

    private DashboardSummaryResponse.EquipmentSummary summaryFor(Equipment equipment) {
        SensorReading reading = sensorReadingRepository
                .findFirstByEquipmentIdOrderByRecordedAtDesc(equipment.getId()).orElse(null);
        AlarmCounts counts = alarmCounts(equipment.getId());
        return new DashboardSummaryResponse.EquipmentSummary(
                equipment.getId(), equipment.getEquipmentCode(), equipment.getEquipmentType(),
                equipment.getDisplayName(), overallStatus(reading, counts),
                toInstant(reading == null ? null : reading.getRecordedAt()), counts.unresolved());
    }

    private AlarmCounts alarmCounts(Long equipmentId) {
        return new AlarmCounts(
                alarmRepository.countByEquipmentIdAndStatus(equipmentId, AlarmStatus.ACTIVE),
                alarmRepository.countByEquipmentIdAndStatus(equipmentId, AlarmStatus.ACKNOWLEDGED));
    }

    private String overallStatus(SensorReading reading, AlarmCounts counts) {
        if (reading == null || reading.getRecordedAt().isBefore(
                LocalDateTime.now().minusSeconds(OFFLINE_TIMEOUT_SECONDS))) {
            return "OFFLINE";
        }
        boolean critical = alarmRepository.existsByEquipmentIdAndStatusNotAndSeverity(
                reading.getEquipment().getId(), AlarmStatus.RESOLVED, AlarmSeverity.CRITICAL);
        if (critical) {
            return "CRITICAL";
        }
        return counts.unresolved() > 0 ? "WARNING" : "NORMAL";
    }

    private ReadingResponse toResponse(SensorReading reading) {
        return new ReadingResponse(reading.getId(), reading.getEquipment().getId(),
                toInstant(reading.getRecordedAt()), parseData(reading));
    }

    private Map<String, Object> parseData(SensorReading reading) {
        try {
            return objectMapper.readValue(reading.getReadingData(), READING_TYPE);
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INVALID_READING_DATA",
                    "Stored sensor reading data is invalid.");
        }
    }

    private Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.atZone(ZoneId.systemDefault()).toInstant();
    }

    private record AlarmCounts(long active, long acknowledged) {
        long unresolved() {
            return active + acknowledged;
        }
    }
}
