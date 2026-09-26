package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.ThresholdResponse;
import com.faultmonitor.backend.dto.UpsertThresholdRequest;
import com.faultmonitor.backend.service.ThresholdService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SettingsController {

    private final ThresholdService thresholdService;

    @GetMapping("/equipment/{equipmentId}/thresholds")
    @PreAuthorize("hasRole('ADMIN')")
    public List<ThresholdResponse> listThresholds(@PathVariable Long equipmentId) {
        return thresholdService.findByEquipment(equipmentId);
    }

    @PutMapping("/equipment/{equipmentId}/thresholds/{metricKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ThresholdResponse upsertThreshold(
            @PathVariable Long equipmentId,
            @PathVariable String metricKey,
            @Valid @RequestBody UpsertThresholdRequest request,
            Authentication authentication) {
        UpsertThresholdRequest normalized = new UpsertThresholdRequest(metricKey, request.value());
        return thresholdService.upsert(equipmentId, normalized, authentication.getName());
    }

    @DeleteMapping("/equipment/{equipmentId}/thresholds/{metricKey}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteThreshold(
            @PathVariable Long equipmentId,
            @PathVariable String metricKey,
            Authentication authentication) {
        thresholdService.delete(equipmentId, metricKey);
        return ResponseEntity.noContent().build();
    }
}
