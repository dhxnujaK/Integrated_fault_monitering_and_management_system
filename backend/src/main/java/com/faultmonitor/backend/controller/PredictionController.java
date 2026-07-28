package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.MlHealthResponse;
import com.faultmonitor.backend.dto.PredictionResponse;
import com.faultmonitor.backend.ml.MlClient;
import com.faultmonitor.backend.service.PredictionService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;
    private final MlClient mlClient;

    @GetMapping("/api/predictions/latest")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public List<PredictionResponse> latest() {
        return predictionService.latest();
    }

    @GetMapping("/api/predictions/ml-health")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public MlHealthResponse mlHealth() {
        return mlClient.health();
    }

    @GetMapping("/api/equipment/{equipmentId}/predictions")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public PageResponse<PredictionResponse> history(
            @PathVariable Long equipmentId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return predictionService.history(equipmentId, page, size);
    }
}
