package com.faultmonitor.backend.ml;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.faultmonitor.backend.dto.MlHealthResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
public class MlClient {

    private final RestTemplate restTemplate;
    private final String predictUrl;
    private final String healthUrl;
    private final String baseUrl;
    private final int retryCount;

    public MlClient(
            RestTemplateBuilder builder,
            @Value("${ml.service.url:http://localhost:8000}") String baseUrl,
            @Value("${ml.service.timeout-ms:3000}") long timeoutMs,
            @Value("${ml.service.retry-count:1}") int retryCount) {
        this.restTemplate = builder
                .connectTimeout(Duration.ofMillis(timeoutMs))
                .readTimeout(Duration.ofMillis(timeoutMs))
                .build();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.predictUrl = this.baseUrl + "/predict";
        this.healthUrl = this.baseUrl + "/health";
        this.retryCount = Math.max(0, retryCount);
    }

    public MlHealthResponse health() {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> details = restTemplate.getForObject(healthUrl, Map.class);
            String status = String.valueOf(details == null ? "UNKNOWN" : details.getOrDefault("status", "UNKNOWN"));
            return new MlHealthResponse(status, baseUrl, true, details == null ? Map.of() : details, Instant.now());
        } catch (RestClientException exception) {
            log.warn("ML health check failed: {}", exception.getMessage());
            return new MlHealthResponse("UNREACHABLE", baseUrl, false,
                    Map.of("error", exception.getMessage()), Instant.now());
        }
    }

    public MlPredictionResult predict(MlPredictionRequest request) {
        RestClientException lastFailure = null;
        for (int attempt = 0; attempt <= retryCount; attempt++) {
            try {
                MlServiceResponse response = restTemplate.postForObject(predictUrl, request, MlServiceResponse.class);
                if (response == null) {
                    throw new RestClientException("ML service returned an empty response.");
                }
                return response.toResult();
            } catch (RestClientException exception) {
                lastFailure = exception;
                log.warn("ML prediction request failed for {} on attempt {}/{}: {}",
                        request.equipmentCode(), attempt + 1, retryCount + 1, exception.getMessage());
            }
        }
        throw lastFailure == null ? new RestClientException("ML prediction request failed.") : lastFailure;
    }

    private record MlServiceResponse(
            @JsonAlias("failure_probability") Double failureProbability,
            @JsonAlias("predicted_failure_type") String predictedFailureType,
            @JsonAlias("recommended_actions") List<String> recommendedActions,
            Double confidence,
            @JsonAlias("model_version") String modelVersion
    ) {
        MlPredictionResult toResult() {
            return new MlPredictionResult(
                    failureProbability == null ? 0.0 : failureProbability,
                    predictedFailureType == null || predictedFailureType.isBlank() ? "UNKNOWN" : predictedFailureType,
                    recommendedActions == null ? List.of() : recommendedActions,
                    confidence == null ? 0.0 : confidence,
                    modelVersion == null || modelVersion.isBlank() ? "unversioned" : modelVersion);
        }
    }
}
