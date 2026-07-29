package com.faultmonitor.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.dto.DiagnosisActionResponse;
import com.faultmonitor.backend.dto.DiagnosisResponse;
import com.faultmonitor.backend.dto.EquipmentDiagnosisResponse;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.AlarmRepository;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DiagnosisService {

    private static final List<AlarmStatus> UNRESOLVED = List.of(
            AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED);

    private final AlarmRepository alarmRepository;
    private final EquipmentService equipmentService;
    private final ObjectMapper objectMapper;
    private final Map<String, DiagnosisResponse> diagnosesByAlarmCode = new LinkedHashMap<>();
    private final Map<String, DiagnosisResponse> diagnosesByKey = new LinkedHashMap<>();
    private final Map<String, DiagnosisResponse> diagnosesByFailureType = new LinkedHashMap<>();

    @Value("${diagnosis.catalog.path:../ml-service/data/diagnosis-catalog.json}")
    private String catalogPath;

    @PostConstruct
    void loadCatalog() {
        try {
            JsonNode root = objectMapper.readTree(Files.readString(Path.of(catalogPath)));
            for (JsonNode entry : root.path("entries")) {
                DiagnosisResponse diagnosis = toDiagnosis(entry);
                diagnosesByKey.put(normalize(diagnosis.key()), diagnosis);
                if (diagnosis.sourceFailureType() != null && !diagnosis.sourceFailureType().isBlank()) {
                    diagnosesByFailureType.put(normalize(diagnosis.sourceFailureType()), diagnosis);
                }
                entry.path("alarmCodes").forEach(code -> diagnosesByAlarmCode.put(normalize(code.asText()), diagnosis));
                entry.path("sharedAlarmCodes").forEach(code -> diagnosesByAlarmCode.putIfAbsent(
                        normalize(code.asText()), diagnosis));
            }
            log.info("Loaded {} diagnosis catalogue entries from {}.", diagnosesByKey.size(), catalogPath);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load diagnosis catalogue from " + catalogPath, exception);
        }
    }

    @Transactional(readOnly = true)
    public List<DiagnosisResponse> findAll() {
        return diagnosesByKey.values().stream()
                .sorted(Comparator.comparing(DiagnosisResponse::key))
                .toList();
    }

    public Optional<DiagnosisResponse> findByAlarmCode(String alarmCode) {
        if (alarmCode == null || alarmCode.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(diagnosesByAlarmCode.get(normalize(alarmCode)));
    }

    public DiagnosisResponse requireByKey(String key) {
        String normalized = normalize(key);
        DiagnosisResponse diagnosis = diagnosesByKey.get(normalized);
        if (diagnosis == null) {
            diagnosis = diagnosesByFailureType.get(normalized);
        }
        if (diagnosis == null) {
            diagnosis = diagnosesByAlarmCode.get(normalized);
        }
        if (diagnosis == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "DIAGNOSIS_NOT_FOUND",
                    "No diagnosis catalogue entry exists for " + key + ".");
        }
        return diagnosis;
    }

    @Transactional(readOnly = true)
    public List<EquipmentDiagnosisResponse> findForEquipment(Long equipmentId, boolean unresolved) {
        equipmentService.requireEquipment(equipmentId);
        List<Alarm> alarms = unresolved
                ? alarmRepository.findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
                        equipmentId, UNRESOLVED)
                : alarmRepository.findByEquipmentIdOrderBySeverityAscTriggeredAtDesc(equipmentId);
        return alarms.stream()
                .map(alarm -> {
                    DiagnosisResponse diagnosis = findByAlarmCode(alarm.getAlarmCode()).orElse(null);
                    return new EquipmentDiagnosisResponse(
                            com.faultmonitor.backend.dto.AlarmResponse.from(alarm, diagnosis), diagnosis);
                })
                .toList();
    }

    public Set<String> supportedAlarmCodes() {
        return diagnosesByAlarmCode.keySet();
    }

    public Set<String> supportedFailureTypes() {
        return diagnosesByFailureType.keySet();
    }

    private DiagnosisResponse toDiagnosis(JsonNode entry) {
        List<String> probableCauses = new ArrayList<>();
        entry.path("probableCauses").forEach(cause -> probableCauses.add(cause.asText()));
        List<DiagnosisActionResponse> correctiveActions = new ArrayList<>();
        entry.path("correctiveActions").forEach(action -> correctiveActions.add(new DiagnosisActionResponse(
                action.path("step").asInt(correctiveActions.size() + 1),
                action.path("action").asText())));
        return new DiagnosisResponse(
                entry.path("key").asText(),
                "CATALOGUE_ENTRY",
                entry.path("observablePattern").asText(),
                probableCauses,
                correctiveActions,
                entry.path("datasetFailureType").isNull() ? null : entry.path("datasetFailureType").asText(null),
                entry.path("predictable").asBoolean(false));
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }
}
