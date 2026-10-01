package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.DiagnosisResponse;
import com.faultmonitor.backend.dto.PredictionResponse;
import com.faultmonitor.backend.dto.PredictionSummaryResponse;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.ml.MlFeatureService;
import com.faultmonitor.backend.ml.MlPredictionRequest;
import com.faultmonitor.backend.ml.MlPredictionResult;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.PredictionRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Comparator;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PredictionService {

    private static final TypeReference<Map<String, Object>> READING_TYPE = new TypeReference<>() { };
    private static final TypeReference<List<String>> ACTIONS_TYPE = new TypeReference<>() { };
    private static final Set<SubsystemType> SUPPORTED_FORECAST_TYPES = Set.of(
            SubsystemType.GENERATOR, SubsystemType.MDP, SubsystemType.SDP, SubsystemType.UPS);
    private static final List<AlarmStatus> UNRESOLVED_ALARM_STATUSES = List.of(
            AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED);

    private final EquipmentRepository equipmentRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final PredictionRepository predictionRepository;
    private final AlarmRepository alarmRepository;
    private final EquipmentService equipmentService;
    private final DiagnosisService diagnosisService;
    private final MlFeatureService mlFeatureService;
    private final MlClient mlClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public int runPredictionsForEnabledEquipment() {
        int saved = 0;
        for (Equipment equipment : equipmentRepository.findByEnabledTrueOrderByEquipmentCodeAsc()) {
            if (!SUPPORTED_FORECAST_TYPES.contains(equipment.getEquipmentType())) {
                log.debug("Skipping prediction for {} because {} has no six-hour forecast model.",
                        equipment.getEquipmentCode(), equipment.getEquipmentType());
                continue;
            }
            try {
                if (predictAndSave(equipment).isPresent()) {
                    saved++;
                }
            } catch (Exception exception) {
                log.warn("Skipping prediction for {} after failure: {}",
                        equipment.getEquipmentCode(), exception.getMessage());
            }
        }
        return saved;
    }

    @Transactional(readOnly = true)
    public List<PredictionResponse> latest() {
        return equipmentRepository.findByEnabledTrueOrderByEquipmentCodeAsc().stream()
                .map(equipment -> predictionRepository.findFirstByEquipmentIdOrderByPredictedAtDesc(equipment.getId()))
                .flatMap(java.util.Optional::stream)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PredictionSummaryResponse summary() {
        List<PredictionResponse> latest = latest();
        long high = latest.stream().filter(prediction -> "HIGH".equals(prediction.riskLevel())).count();
        long medium = latest.stream().filter(prediction -> "MEDIUM".equals(prediction.riskLevel())).count();
        long low = latest.stream().filter(prediction -> "LOW".equals(prediction.riskLevel())).count();
        return new PredictionSummaryResponse(latest.size(), high, medium, low);
    }

    @Transactional(readOnly = true)
    public PageResponse<PredictionResponse> history(Long equipmentId, int page, int size) {
        equipmentService.requireEquipment(equipmentId);
        AtomicInteger index = new AtomicInteger();
        return PageResponse.from(predictionRepository
                .findByEquipmentIdOrderByPredictedAtDesc(
                        equipmentId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "predictedAt")))
                .map(prediction -> toResponse(prediction, page == 0 && index.getAndIncrement() == 0)));
    }

    private java.util.Optional<Prediction> predictAndSave(Equipment equipment) {
        int window = mlFeatureService.trendWindowReadings();
        List<SensorReading> recent = sensorReadingRepository.findByEquipmentIdOrderByRecordedAtDesc(
                equipment.getId(), PageRequest.of(0, window + 1));
        if (recent.isEmpty()) {
            log.debug("Skipping prediction for {} because no sensor reading exists.", equipment.getEquipmentCode());
            return java.util.Optional.empty();
        }
        SensorReading reading = recent.get(0);
        Map<String, Object> previous = recent.size() > window ? parseReading(recent.get(window)) : null;

        MlPredictionResult result = mlClient.predict(new MlPredictionRequest(
                equipment.getId(),
                equipment.getEquipmentCode(),
                equipment.getEquipmentType(),
                mlFeatureService.enrich(reading, parseReading(reading), previous)));
        Prediction prediction = Prediction.builder()
                .equipment(equipment)
                .subsystemType(equipment.getEquipmentType())
                .subsystemId(equipment.getEquipmentCode())
                .failureProbability(result.failureProbability())
                .predictedFailureType(result.predictedFailureType())
                .recommendedActions(writeActions(result.recommendedActions()))
                .confidence(result.confidence())
                .modelVersion(result.modelVersion())
                .estimatedTimeToFailureMinutes(result.estimatedTimeToFailureMinutes())
                .riskLevel(result.riskLevel())
                .build();
        return java.util.Optional.of(predictionRepository.save(prediction));
    }

    private PredictionResponse toResponse(Prediction prediction) {
        return toResponse(prediction, true);
    }

    private PredictionResponse toResponse(Prediction prediction, boolean reconcileLiveAlarm) {
        List<String> actions = readActions(prediction.getRecommendedActions());
        DiagnosisResponse diagnosis = predictionDiagnosis(prediction);
        Optional<Alarm> liveAlarm = reconcileLiveAlarm ? mostImportantUnresolvedAlarm(prediction) : Optional.empty();
        if (liveAlarm.isPresent()) {
            Alarm alarm = liveAlarm.get();
            DiagnosisResponse alarmDiagnosis = diagnosisService.findByAlarmCode(alarm.getAlarmCode()).orElse(diagnosis);
            List<String> alarmActions = alarmDiagnosis == null
                    ? actions
                    : alarmDiagnosis.correctiveActions().stream()
                            .map(com.faultmonitor.backend.dto.DiagnosisActionResponse::action)
                            .toList();
            return reconciledAlarmResponse(prediction, alarm, alarmDiagnosis, alarmActions);
        }
        return PredictionResponse.from(
                prediction,
                actions,
                riskLevelOf(prediction),
                diagnosis);
    }

    /** Predictions saved before risk levels existed fall back to fixed probability bands. */
    private String riskLevelOf(Prediction prediction) {
        if (prediction.getRiskLevel() != null) {
            return prediction.getRiskLevel();
        }
        double probability = probability(prediction.getFailureProbability());
        return probability >= 0.7 ? "HIGH" : probability >= 0.4 ? "MEDIUM" : "LOW";
    }

    private PredictionResponse reconciledAlarmResponse(
            Prediction prediction,
            Alarm alarm,
            DiagnosisResponse diagnosis,
            List<String> actions) {
        double alarmProbability = alarm.getSeverity() == AlarmSeverity.CRITICAL ? 0.95 : 0.55;
        double alarmConfidence = alarm.getSeverity() == AlarmSeverity.CRITICAL ? 0.95 : 0.75;
        return new PredictionResponse(
                prediction.getId(),
                prediction.getEquipment() == null ? null : prediction.getEquipment().getId(),
                prediction.getEquipment() == null ? prediction.getSubsystemId() : prediction.getEquipment().getEquipmentCode(),
                prediction.getSubsystemType(),
                Math.max(probability(prediction.getFailureProbability()), alarmProbability),
                alarm.getAlarmCode(),
                actions,
                Math.max(probability(prediction.getConfidence()), alarmConfidence),
                prediction.getModelVersion(),
                // Integer.valueOf keeps the ternary boxed; a plain 0 would unbox a null estimate and throw.
                alarm.getSeverity() == AlarmSeverity.CRITICAL ? Integer.valueOf(0) : prediction.getEstimatedTimeToFailureMinutes(),
                alarm.getSeverity() == AlarmSeverity.CRITICAL || "HIGH".equals(riskLevelOf(prediction)) ? "HIGH" : "MEDIUM",
                PredictionResponse.toInstant(prediction.getPredictedAt()),
                diagnosis);
    }

    private DiagnosisResponse predictionDiagnosis(Prediction prediction) {
        if (prediction.getPredictedFailureType() == null || prediction.getPredictedFailureType().isBlank()) {
            return null;
        }
        return diagnosisService.findByAlarmCode(prediction.getPredictedFailureType())
                .orElseGet(() -> {
                    try {
                        return diagnosisService.requireByKey(prediction.getPredictedFailureType());
                    } catch (ApiException exception) {
                        return null;
                    }
                });
    }

    private Optional<Alarm> mostImportantUnresolvedAlarm(Prediction prediction) {
        if (prediction.getEquipment() == null) {
            return Optional.empty();
        }
        return alarmRepository.findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
                        prediction.getEquipment().getId(), UNRESOLVED_ALARM_STATUSES)
                .stream()
                .filter(alarm -> diagnosisService.findByAlarmCode(alarm.getAlarmCode()).isPresent())
                .max(Comparator
                        .comparingInt((Alarm alarm) -> alarm.getSeverity() == AlarmSeverity.CRITICAL ? 2 : 1)
                        .thenComparing(Alarm::getTriggeredAt, Comparator.nullsFirst(Comparator.naturalOrder())));
    }

    private Map<String, Object> parseReading(SensorReading reading) {
        try {
            String payload = reading.getReadingData();
            JsonNode json = objectMapper.readTree(payload);
            if (json.isTextual()) {
                payload = json.textValue();
            }
            return objectMapper.readValue(payload, READING_TYPE);
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "INVALID_READING_DATA",
                    "Stored sensor reading data is invalid.");
        }
    }

    private String writeActions(List<String> actions) {
        try {
            return objectMapper.writeValueAsString(actions == null ? List.of() : actions);
        } catch (JsonProcessingException exception) {
            return "[]";
        }
    }

    private List<String> readActions(String actions) {
        if (actions == null || actions.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(actions, ACTIONS_TYPE);
        } catch (JsonProcessingException exception) {
            return List.of(actions);
        }
    }


    private double probability(Double value) {
        return value == null ? 0.0 : value;
    }
}
