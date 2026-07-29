package com.faultmonitor.backend.dto;

import java.time.Instant;

public record PredictionRunResponse(
        int savedCount,
        Instant runAt
) {
}
