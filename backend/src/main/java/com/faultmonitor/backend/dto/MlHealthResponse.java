package com.faultmonitor.backend.dto;

import java.time.Instant;
import java.util.Map;

public record MlHealthResponse(
        String status,
        String serviceUrl,
        boolean reachable,
        Map<String, Object> details,
        Instant checkedAt
) {
}
