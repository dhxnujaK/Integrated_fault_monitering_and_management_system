package com.faultmonitor.backend.ml;

import com.faultmonitor.backend.service.PredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ml.prediction.enabled", havingValue = "true")
public class PredictionScheduler {

    private final PredictionService predictionService;

    @Scheduled(
            initialDelayString = "${ml.prediction.initial-delay-ms:15000}",
            fixedDelayString = "${ml.prediction.fixed-delay-ms:60000}")
    public void run() {
        int saved = predictionService.runPredictionsForEnabledEquipment();
        log.info("Prediction scheduler persisted {} prediction(s).", saved);
    }
}
