package com.faultmonitor.backend.dto;

import java.time.Instant;
import java.util.Map;

public record ReadingResponse(
        Long id,
        Long equipmentId,
        Instant recordedAt,
        Map<String, Object> data
) {
}
