package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.DashboardSummaryResponse;
import com.faultmonitor.backend.service.MonitoringService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final MonitoringService monitoringService;

    @GetMapping("/summary")
    public DashboardSummaryResponse summary() {
        return monitoringService.dashboardSummary();
    }
}
