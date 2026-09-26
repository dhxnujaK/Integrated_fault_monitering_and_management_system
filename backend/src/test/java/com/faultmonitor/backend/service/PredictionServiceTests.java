package com.faultmonitor.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.ml.MlPredictionResult;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.PredictionRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@Transactional
class PredictionServiceTests {

    @Autowired
    private PredictionService predictionService;

    @Autowired
    private EquipmentRepository equipmentRepository;

    @Autowired
    private SensorReadingRepository sensorReadingRepository;

    @Autowired
    private PredictionRepository predictionRepository;

    @MockBean
    private MlClient mlClient;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        predictionRepository.deleteAll();
        generator = equipmentRepository.findByEquipmentCode("GENERATOR-01").orElseThrow();
        sensorReadingRepository.save(SensorReading.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .readingData("""
                        {"fuel_level_pct":15.0,"running_status":"RUNNING","room_temperature_c":30.0}
                        """)
                .build());
    }

    @Test
    void persistsPredictionWithEquipmentAndModelVersion() {
        when(mlClient.predict(any())).thenReturn(new MlPredictionResult(
                0.82, "GEN_LOW_FUEL", List.of("Refill the day tank"), 0.74, "demo-v1"));

        int saved = predictionService.runPredictionsForEnabledEquipment();

        assertThat(saved).isGreaterThanOrEqualTo(1);
        Prediction prediction = predictionRepository.findFirstByEquipmentIdOrderByPredictedAtDesc(generator.getId())
                .orElseThrow();
        assertThat(prediction.getEquipment().getId()).isEqualTo(generator.getId());
        assertThat(prediction.getFailureProbability()).isEqualTo(0.82);
        assertThat(prediction.getModelVersion()).isEqualTo("demo-v1");
        assertThat(predictionService.latest())
                .anySatisfy(response -> assertThat(response.equipmentId()).isEqualTo(generator.getId()));
    }

    @Test
    void mlServiceFailureDoesNotAbortOtherEquipmentProcessing() {
        when(mlClient.predict(any())).thenThrow(new RestClientException("ML service unavailable"));

        int saved = predictionService.runPredictionsForEnabledEquipment();

        assertThat(saved).isZero();
        assertThat(predictionRepository.findAll()).isEmpty();
    }
}
