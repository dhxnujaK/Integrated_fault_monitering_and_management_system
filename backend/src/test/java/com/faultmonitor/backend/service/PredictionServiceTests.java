package com.faultmonitor.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.ml.MlPredictionResult;
import com.faultmonitor.backend.repository.AlarmRepository;
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

    @Autowired
    private AlarmRepository alarmRepository;

    @MockBean
    private MlClient mlClient;

    private Equipment generator;

    @BeforeEach
    void setUp() {
        predictionRepository.deleteAll();
        alarmRepository.deleteAll();
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
                0.82, "GEN_LOW_FUEL", List.of("Refill the day tank"), 0.74, "demo-v1", 65));

        int saved = predictionService.runPredictionsForEnabledEquipment();

        assertThat(saved).isGreaterThanOrEqualTo(1);
        Prediction prediction = predictionRepository.findFirstByEquipmentIdOrderByPredictedAtDesc(generator.getId())
                .orElseThrow();
        assertThat(prediction.getEquipment().getId()).isEqualTo(generator.getId());
        assertThat(prediction.getFailureProbability()).isEqualTo(0.82);
        assertThat(prediction.getModelVersion()).isEqualTo("demo-v1");
        assertThat(prediction.getEstimatedTimeToFailureMinutes()).isEqualTo(65);
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

    @Test
    void latestPredictionIsReconciledWithCurrentCriticalAlarm() {
        predictionRepository.saveAndFlush(Prediction.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .failureProbability(0.0)
                .predictedFailureType(null)
                .recommendedActions("[]")
                .confidence(0.5)
                .modelVersion("test-v1")
                .build());
        alarmRepository.saveAndFlush(Alarm.builder()
                .equipment(generator)
                .subsystemType(generator.getEquipmentType())
                .subsystemId(generator.getEquipmentCode())
                .alarmCode("GEN_LOW_FUEL")
                .alarmMessage("Fuel level is below 20%.")
                .severity(AlarmSeverity.CRITICAL)
                .status(AlarmStatus.ACTIVE)
                .build());

        assertThat(predictionService.latest())
                .anySatisfy(response -> {
                    assertThat(response.equipmentId()).isEqualTo(generator.getId());
                    assertThat(response.predictedFailureType()).isEqualTo("GEN_LOW_FUEL");
                    assertThat(response.failureProbability()).isGreaterThanOrEqualTo(0.95);
                    assertThat(response.estimatedTimeToFailureMinutes()).isZero();
                    assertThat(response.diagnosis()).isNotNull();
                });
    }
}
