package com.faultmonitor.backend.ml;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MlFeatureServiceTests {

    private final MlFeatureService featureService = new MlFeatureService();

    @Test
    void enrichesGeneratorReadingsWithDerivedModelFeatures() {
        SensorReading reading = SensorReading.builder()
                .subsystemType(SubsystemType.GENERATOR)
                .subsystemId("GENERATOR-01")
                .build();

        Map<String, Object> features = featureService.enrich(reading, Map.of(
                "running_status", "RUNNING",
                "voltage_L1", 229.0,
                "voltage_L2", 230.0,
                "voltage_L3", 232.0,
                "current_L1", 30.0,
                "current_L2", 32.0,
                "current_L3", 31.0));

        assertThat(features)
                .containsKeys(
                        "operating_state",
                        "hour_sin",
                        "hour_cos",
                        "day_of_week_sin",
                        "day_of_week_cos",
                        "phase_voltage_imbalance_v",
                        "phase_current_imbalance_pct",
                        "voltage_deviation_pct",
                        "temperature_change_c_per_hour");
        assertThat(features.get("operating_state")).isEqualTo("RUNNING");
    }

    @Test
    void enrichesUpsReadingsWithPredictionDefaults() {
        SensorReading reading = SensorReading.builder()
                .subsystemType(SubsystemType.UPS)
                .subsystemId("UPS-01")
                .build();

        Map<String, Object> features = featureService.enrich(reading, Map.of(
                "operational_status", "ONLINE",
                "input_voltage_v", 231.0,
                "output_voltage_v", 230.0,
                "load_pct", 40.0));

        assertThat(features)
                .containsEntry("operating_state", "ONLINE")
                .containsEntry("fault_code", "NONE")
                .containsKeys(
                        "voltage_deviation_pct",
                        "temperature_change_c_per_hour",
                        "load_change_pct_per_hour",
                        "battery_discharge_rate_pct_per_hour");
    }
}
