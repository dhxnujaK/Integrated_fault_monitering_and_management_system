package com.faultmonitor.backend.ml;

import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class MlFeatureService {

    private static final double NOMINAL_VOLTAGE = 230.0;

    public Map<String, Object> enrich(SensorReading reading, Map<String, Object> raw) {
        Map<String, Object> features = new LinkedHashMap<>(raw);
        addTimeFeatures(features, reading.getRecordedAt());
        SubsystemType type = reading.getSubsystemType();
        if (type == SubsystemType.GENERATOR) {
            enrichGenerator(features);
        } else if (type == SubsystemType.MDP) {
            enrichDistribution(features, "main_breaker_status", "CLOSED");
        } else if (type == SubsystemType.SDP) {
            enrichDistribution(features, "breaker_status", "CLOSED");
        } else if (type == SubsystemType.UPS) {
            enrichUps(features);
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
        features.putIfAbsent("operating_state", text(features, "running_status", "UNKNOWN"));
        features.putIfAbsent("running_status", "UNKNOWN");
        features.putIfAbsent("breaker_status", "UNKNOWN");
        features.putIfAbsent("intruder_alarm", false);
        features.putIfAbsent("fire_alarm", false);
        addPhaseFeatures(features, List.of("voltage_L1", "voltage_L2", "voltage_L3"),
                List.of("current_L1", "current_L2", "current_L3"));
        features.putIfAbsent("temperature_change_c_per_hour", 0.0);
    }

    private void enrichDistribution(Map<String, Object> features, String breakerKey, String defaultBreaker) {
        features.putIfAbsent("operating_state", energized(features) ? "ENERGIZED" : "DEENERGIZED");
        features.putIfAbsent(breakerKey, defaultBreaker);
        features.putIfAbsent("intruder_alarm", false);
        features.putIfAbsent("fire_alarm", false);
        addPhaseFeatures(features, List.of("voltage_R", "voltage_Y", "voltage_B"),
                List.of("current_R", "current_Y", "current_B"));
        features.putIfAbsent("temperature_change_c_per_hour", 0.0);
    }

    private void enrichUps(Map<String, Object> features) {
        String status = text(features, "operational_status", "UNKNOWN");
        features.putIfAbsent("operating_state", status);
        features.putIfAbsent("fault_code", "NONE");
        features.putIfAbsent("voltage_deviation_pct", voltageDeviation(
                numbers(features, List.of("input_voltage_v", "output_voltage_v"))));
        features.putIfAbsent("temperature_change_c_per_hour", 0.0);
        features.putIfAbsent("load_change_pct_per_hour", 0.0);
        features.putIfAbsent("battery_discharge_rate_pct_per_hour", 0.0);
    }

    private void addPhaseFeatures(
            Map<String, Object> features,
            List<String> voltageKeys,
            List<String> currentKeys) {
        List<Double> voltages = numbers(features, voltageKeys);
        List<Double> currents = numbers(features, currentKeys);
        features.putIfAbsent("phase_voltage_imbalance_v", spread(voltages));
        features.putIfAbsent("phase_current_imbalance_pct", imbalancePct(currents));
        features.putIfAbsent("voltage_deviation_pct", voltageDeviation(voltages));
    }

    private boolean energized(Map<String, Object> features) {
        return numbers(features, List.of("voltage_R", "voltage_Y", "voltage_B")).stream().anyMatch(value -> value > 1.0);
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

    private double imbalancePct(List<Double> values) {
        if (values.isEmpty()) {
            return 0.0;
        }
        double average = values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        return average == 0.0 ? 0.0 : (spread(values) / average) * 100.0;
    }

    private double voltageDeviation(List<Double> values) {
        if (values.isEmpty()) {
            return 0.0;
        }
        double average = values.stream().mapToDouble(Double::doubleValue).average().orElse(NOMINAL_VOLTAGE);
        return Math.abs(average - NOMINAL_VOLTAGE) / NOMINAL_VOLTAGE * 100.0;
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
