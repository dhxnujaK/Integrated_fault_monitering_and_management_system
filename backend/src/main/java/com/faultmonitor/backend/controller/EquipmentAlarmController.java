package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.AlarmResponse;
import com.faultmonitor.backend.service.AlarmService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/equipment/{equipmentId}/alarms")
@RequiredArgsConstructor
public class EquipmentAlarmController {

    private final AlarmService alarmService;

    @GetMapping
    public List<AlarmResponse> findForEquipment(
            @PathVariable Long equipmentId,
            @RequestParam(defaultValue = "true") boolean unresolved) {
        return alarmService.findForEquipment(equipmentId, unresolved);
    }
}
