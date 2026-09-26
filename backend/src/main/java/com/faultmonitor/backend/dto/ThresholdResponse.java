package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.EquipmentThreshold;
import java.time.LocalDateTime;

/**
 * Response for a single threshold override row.
 *
 * @param id           the threshold record ID
 * @param equipmentId  equipment this threshold belongs to
 * @param metricKey    the metric identifier (e.g. "GENERATOR_LOW_FUEL")
 * @param value        the override value
 * @param defaultValue the hard-coded system default (returned for display)
 * @param minValue     minimum legal value for this metric (null if unrestricted)
 * @param maxValue     maximum legal value for this metric (null if unrestricted)
 * @param label        human-readable metric name
 * @param unit         units string for display
 * @param updatedBy    username of the last admin who changed this
 * @param updatedAt    wall-clock time of the last change
 */
public record ThresholdResponse(
        Long id,
        Long equipmentId,
        String equipmentCode,
        String metricKey,
        double value,
        Double defaultValue,
        Double minValue,
        Double maxValue,
        String label,
        String unit,
        String updatedBy,
        LocalDateTime updatedAt) {

    public static ThresholdResponse from(EquipmentThreshold t, Double defaultValue) {
        return new ThresholdResponse(
                t.getId(),
                t.getEquipment().getId(),
                t.getEquipment().getEquipmentCode(),
                t.getMetricKey(),
                t.getValue(),
                defaultValue,
                t.getMinValue(),
                t.getMaxValue(),
                t.getLabel(),
                t.getUnit(),
                t.getUpdatedBy(),
                t.getUpdatedAt());
    }
}
