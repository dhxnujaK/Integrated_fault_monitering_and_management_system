package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.AcknowledgeAlarmRequest;
import com.faultmonitor.backend.dto.AlarmResponse;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.service.AlarmService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/alarms")
@RequiredArgsConstructor
public class AlarmController {

    private final AlarmService alarmService;

    @GetMapping
    public PageResponse<AlarmResponse> findAll(
            @RequestParam(required = false) AlarmStatus status,
            @RequestParam(required = false) Boolean unresolved,
            @RequestParam(required = false) SubsystemType equipmentType,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) AlarmSeverity severity,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return alarmService.findAll(status, unresolved, equipmentType, equipmentId, severity,
                from, to, page, size);
    }

    @PutMapping("/{alarmId}/acknowledge")
    public AlarmResponse acknowledge(
            @PathVariable Long alarmId,
            @Valid @RequestBody AcknowledgeAlarmRequest request,
            Authentication authentication) {
        return alarmService.acknowledge(alarmId, request.note(), authentication.getName());
    }
}
