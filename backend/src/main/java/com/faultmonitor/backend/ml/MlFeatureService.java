package com.faultmonitor.backend.ml;

import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Builds the model feature vector from a stored reading. Every derived feature mirrors
 * {@code ml-service/scripts/generate_training_dataset.mjs}, so live inputs match what the
 * models were trained on.
 */
@Service
public class MlFeatureService {

    private static final double NOMINAL_VOLTAGE = 230.0;

    private final int trendWindowReadings;
    private final double trendWindowHours;

    public MlFeatureService(
            @Value("${ml.features.trend-window-readings:12}") int trendWindowReadings,
            @Value("${ml.features.reading-interval-minutes:5}") double readingIntervalMinutes) {
        this.trendWindowReadings = Math.max(1, trendWindowReadings);
        this.trendWindowHours = this.trendWindowReadings * readingIntervalMinutes / 60.0;
    }

    /** Number of readings between the current reading and the one used for hourly trend features. */
    public int trendWindowReadings() {
        return trendWindowReadings;
    }

    public Map<String, Object> enrich(SensorReading reading, Map<String, Object> raw) {
        return enrich(reading, raw, null);
    }

    /**
     * @param previous the reading {@link #trendWindowReadings()} samples earlier, or {@code null}
     *                 when there is not enough history yet (trend features are then 0, as in training)
     */
    public Map<String, Object> enrich(SensorReading reading, Map<String, Object> raw, Map<String, Object> previous) {
        Map<String, Object> features = new LinkedHashMap<>(raw);
        addTimeFeatures(features, reading.getRecordedAt());
        SubsystemType type = reading.getSubsystemType();
        if (type == SubsystemType.GENERATOR) {
            enrichGenerator(features);
            addTemperatureTrend(features, previous, "room_temperature_c");
        } else if (type == SubsystemType.MDP) {
            enrichDistribution(features, "main_breaker_status");
            addTemperatureTrend(features, previous, "room_temperature_c");
        } else if (type == SubsystemType.SDP) {
            enrichDistribution(features, "breaker_status");
            addTemperatureTrend(features, previous, "room_temperature_c");
        } else if (type == SubsystemType.UPS) {
            enrichUps(features);
            addTemperatureTrend(features, previous, "temperature_c");
            addUpsTrends(features, previous);
        }
        return features;
    }

    private void addTimeFeatures(Map<String, Object> features, LocalDateTime timestamp) {
        LocalDateTime time = timestamp == null ? LocalDateTime.now() : timestamp;
        double hourAngle = (2 * Math.PI * time.getHour()) / 24;
        double dayAngle = (2 * Math.PI * time.getDayOfWeek().getValue()) / 7;
        features.putIfAbsent("hour_sin", Math.sin(hourAngle));
        features.putIfAbsent("hour_cos", Math.cos(hourAngle));
        features.putIfAbsent("day_of_week_sin", Math.sin(dayAngle));
        features.putIfAbsent("day_of_week_cos", Math.cos(dayAngle));
    }

    private void enrichGenerator(Map<String, Object> features) {
        String status = text(features, "running_status", "UNKNOWN");
        features.putIfAbsent("operating_state", status);
        features.putIfAbsent("running_status", "UNKNOWN");
        features.putIfAbsent("breaker_status", "UNKNOWN");
        features.putIfAbsent("intruder_alarm", false);
        features.putIfAbsent("fire_alarm", false);
        // A generator in standby has no output; training treats 0 V as 0% deviation, not 100%.
        boolean zeroOutputIsNormal = !"RUNNING".equals(status);
        addPhaseFeatures(features, List.of("voltage_L1", "voltage_L2", "voltage_L3"),
                List.of("current_L1", "current_L2", "current_L3"), zeroOutputIsNormal);
    }

    private void enrichDistribution(Map<String, Object> features, String breakerKey) {
        features.putIfAbsent(breakerKey, "CLOSED");
        features.putIfAbsent("operating_state",
                "CLOSED".equals(text(features, breakerKey, "CLOSED")) ? "ENERGIZED" : "DEENERGIZED");
        features.putIfAbsent("intruder_alarm", false);
        features.putIfAbsent("fire_alarm", false);
        addPhaseFeatures(features, List.of("voltage_R", "voltage_Y", "voltage_B"),
                List.of("current_R", "current_Y", "current_B"), false);
    }

    private void enrichUps(Map<String, Object> features) {
        features.putIfAbsent("operating_state", text(features, "operational_status", "UNKNOWN"));
        features.putIfAbsent("fault_code", "NONE");
        Double output = number(features.get("output_voltage_v"));
        features.putIfAbsent("voltage_deviation_pct",
                output == null ? 0.0 : Math.abs(output - NOMINAL_VOLTAGE) / NOMINAL_VOLTAGE * 100.0);
    }

    private void addPhaseFeatures(
            Map<String, Object> features,
            List<String> voltageKeys,
            List<String> currentKeys,
            boolean zeroOutputIsNormal) {
        List<Double> voltages = numbers(features, voltageKeys);
        List<Double> currents = numbers(features, currentKeys);
        features.putIfAbsent("phase_voltage_imbalance_v", spread(voltages));
        features.putIfAbsent("phase_current_imbalance_pct", imbalancePct(currents));
        double averageVoltage = average(voltages);
        features.putIfAbsent("voltage_deviation_pct", voltages.isEmpty() || (zeroOutputIsNormal && averageVoltage < 1.0)
                ? 0.0
                : Math.abs(averageVoltage - NOMINAL_VOLTAGE) / NOMINAL_VOLTAGE * 100.0);
    }

    private void addTemperatureTrend(Map<String, Object> features, Map<String, Object> previous, String key) {
        features.putIfAbsent("temperature_change_c_per_hour", ratePerHour(features, previous, key));
    }

    private void addUpsTrends(Map<String, Object> features, Map<String, Object> previous) {
        features.putIfAbsent("load_change_pct_per_hour", ratePerHour(features, previous, "load_pct"));
        features.putIfAbsent("battery_discharge_rate_pct_per_hour",
                Math.max(0.0, -ratePerHour(features, previous, "battery_charge_pct")));
    }

    private double ratePerHour(Map<String, Object> current, Map<String, Object> previous, String key) {
        if (previous == null) {
            return 0.0;
        }
        Double now = number(current.get(key));
        Double before = number(previous.get(key));
        return now == null || before == null ? 0.0 : (now - before) / trendWindowHours;
    }

    private List<Double> numbers(Map<String, Object> features, List<String> keys) {
        return keys.stream()
                .map(key -> number(features.get(key)))
                .filter(value -> value != null)
                .toList();
    }

    private double spread(List<Double> values) {
        if (values.isEmpty()) {
            return 0.0;
        }
        double min = values.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
        double max = values.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
        return max - min;
    }

    private double average(List<Double> values) {
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private double imbalancePct(List<Double> values) {
        double average = average(values);
        return values.isEmpty() || average <= 0.05 ? 0.0 : (spread(values) / average) * 100.0;
    }

    private String text(Map<String, Object> features, String key, String fallback) {
        Object value = features.get(key);
        return value == null || String.valueOf(value).isBlank() ? fallback : String.valueOf(value);
    }

    private Double number(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }
}
