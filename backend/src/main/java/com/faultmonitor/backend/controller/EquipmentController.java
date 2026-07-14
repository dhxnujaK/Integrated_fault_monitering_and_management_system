package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.CreateEquipmentRequest;
import com.faultmonitor.backend.dto.EquipmentEnabledRequest;
import com.faultmonitor.backend.dto.EquipmentResponse;
import com.faultmonitor.backend.dto.EquipmentStatusResponse;
import com.faultmonitor.backend.dto.ReadingResponse;
import com.faultmonitor.backend.dto.UpdateEquipmentRequest;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.service.EquipmentService;
import com.faultmonitor.backend.service.MonitoringService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/equipment")
@RequiredArgsConstructor
public class EquipmentController {

    private final EquipmentService equipmentService;
    private final MonitoringService monitoringService;

    @GetMapping
    public List<EquipmentResponse> findAll(
            @RequestParam(required = false) SubsystemType type,
            @RequestParam(required = false) Boolean enabled) {
        return equipmentService.findAll(type, enabled);
    }

    @GetMapping("/{equipmentId}")
    public EquipmentResponse findById(@PathVariable Long equipmentId) {
        return equipmentService.findById(equipmentId);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipmentResponse> create(@Valid @RequestBody CreateEquipmentRequest request) {
        EquipmentResponse created = equipmentService.create(request);
        return ResponseEntity.created(URI.create("/api/equipment/" + created.id())).body(created);
    }

    @PutMapping("/{equipmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public EquipmentResponse update(
            @PathVariable Long equipmentId, @Valid @RequestBody UpdateEquipmentRequest request) {
        return equipmentService.update(equipmentId, request);
    }

    @PatchMapping("/{equipmentId}/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    public EquipmentResponse setEnabled(
            @PathVariable Long equipmentId, @Valid @RequestBody EquipmentEnabledRequest request) {
        return equipmentService.setEnabled(equipmentId, request);
    }

    @GetMapping("/{equipmentId}/status")
    public EquipmentStatusResponse status(@PathVariable Long equipmentId) {
        return monitoringService.status(equipmentId);
    }

    @GetMapping("/{equipmentId}/readings")
    public List<ReadingResponse> readings(
            @PathVariable Long equipmentId,
            @RequestParam(defaultValue = "50") @Min(1) @Max(500) int limit) {
        return monitoringService.readings(equipmentId, limit);
    }
}
