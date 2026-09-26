package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.PredictionResponse;
import com.faultmonitor.backend.dto.PredictionSummaryResponse;
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
import com.faultmonitor.backend.repository.PredictionRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    private final EquipmentRepository equipmentRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final PredictionRepository predictionRepository;
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
        long high = latest.stream().filter(prediction -> riskAtLeast(prediction.failureProbability(), 0.7)).count();
        long medium = latest.stream().filter(prediction -> {
            double probability = probability(prediction.failureProbability());
            return probability >= 0.4 && probability < 0.7;
        }).count();
        long low = latest.stream().filter(prediction -> probability(prediction.failureProbability()) < 0.4).count();
        return new PredictionSummaryResponse(latest.size(), high, medium, low);
    }

    @Transactional(readOnly = true)
    public PageResponse<PredictionResponse> history(Long equipmentId, int page, int size) {
        equipmentService.requireEquipment(equipmentId);
        return PageResponse.from(predictionRepository
                .findByEquipmentIdOrderByPredictedAtDesc(
                        equipmentId, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "predictedAt")))
                .map(this::toResponse));
    }

    private java.util.Optional<Prediction> predictAndSave(Equipment equipment) {
        SensorReading reading = sensorReadingRepository.findFirstByEquipmentIdOrderByRecordedAtDesc(equipment.getId())
                .orElse(null);
        if (reading == null) {
            log.debug("Skipping prediction for {} because no sensor reading exists.", equipment.getEquipmentCode());
            return java.util.Optional.empty();
        }

        MlPredictionResult result = mlClient.predict(new MlPredictionRequest(
                equipment.getId(),
                equipment.getEquipmentCode(),
                equipment.getEquipmentType(),
                mlFeatureService.enrich(reading, parseReading(reading))));
        Prediction prediction = Prediction.builder()
                .equipment(equipment)
                .subsystemType(equipment.getEquipmentType())
                .subsystemId(equipment.getEquipmentCode())
                .failureProbability(result.failureProbability())
                .predictedFailureType(result.predictedFailureType())
                .recommendedActions(writeActions(result.recommendedActions()))
                .confidence(result.confidence())
                .modelVersion(result.modelVersion())
                .build();
        return java.util.Optional.of(predictionRepository.save(prediction));
    }

    private PredictionResponse toResponse(Prediction prediction) {
        return PredictionResponse.from(
                prediction,
                readActions(prediction.getRecommendedActions()),
                diagnosisService.findByAlarmCode(prediction.getPredictedFailureType())
                        .orElseGet(() -> {
                            try {
                                return diagnosisService.requireByKey(prediction.getPredictedFailureType());
                            } catch (ApiException exception) {
                                return null;
                            }
                        }));
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

    private boolean riskAtLeast(Double probability, double threshold) {
        return probability(probability) >= threshold;
    }

    private double probability(Double value) {
        return value == null ? 0.0 : value;
    }
}
