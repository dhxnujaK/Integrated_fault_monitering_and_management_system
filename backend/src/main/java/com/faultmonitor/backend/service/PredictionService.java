package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.PredictionResponse;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.ml.MlPredictionRequest;
import com.faultmonitor.backend.ml.MlPredictionResult;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.PredictionRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.util.List;
import java.util.Map;
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

    private final EquipmentRepository equipmentRepository;
    private final SensorReadingRepository sensorReadingRepository;
    private final PredictionRepository predictionRepository;
    private final EquipmentService equipmentService;
    private final MlClient mlClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public int runPredictionsForEnabledEquipment() {
        int saved = 0;
        for (Equipment equipment : equipmentRepository.findByEnabledTrueOrderByEquipmentCodeAsc()) {
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
                parseReading(reading)));
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
        return PredictionResponse.from(prediction, readActions(prediction.getRecommendedActions()));
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
}
