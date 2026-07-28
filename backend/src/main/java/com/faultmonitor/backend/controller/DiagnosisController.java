package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.DiagnosisResponse;
import com.faultmonitor.backend.dto.EquipmentDiagnosisResponse;
import com.faultmonitor.backend.service.DiagnosisService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class DiagnosisController {

    private final DiagnosisService diagnosisService;

    @GetMapping("/api/diagnosis")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public List<DiagnosisResponse> findAll() {
        return diagnosisService.findAll();
    }

    @GetMapping("/api/diagnosis/{key}")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public DiagnosisResponse findByKey(@PathVariable String key) {
        return diagnosisService.requireByKey(key);
    }

    @GetMapping("/api/equipment/{equipmentId}/diagnosis")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public List<EquipmentDiagnosisResponse> findForEquipment(
            @PathVariable Long equipmentId,
            @RequestParam(defaultValue = "true") boolean unresolved) {
        return diagnosisService.findForEquipment(equipmentId, unresolved);
    }
}
