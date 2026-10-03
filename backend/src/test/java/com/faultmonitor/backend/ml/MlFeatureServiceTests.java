package com.faultmonitor.backend.ml;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MlFeatureServiceTests {

    private final MlFeatureService featureService = new MlFeatureService(12, 5);

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

    @Test
    void trendFeaturesCompareWithTheReadingOneHourEarlier() {
        SensorReading reading = SensorReading.builder().subsystemType(SubsystemType.UPS).subsystemId("UPS-01").build();

        Map<String, Object> features = featureService.enrich(reading,
                Map.of("operational_status", "ONLINE", "temperature_c", 33.0, "load_pct", 70.0, "battery_charge_pct", 90.0),
                Map.of("temperature_c", 30.0, "load_pct", 60.0, "battery_charge_pct", 96.0));

        assertThat(features)
                .containsEntry("temperature_change_c_per_hour", 3.0)
                .containsEntry("load_change_pct_per_hour", 10.0)
                .containsEntry("battery_discharge_rate_pct_per_hour", 6.0);
    }

    @Test
    void trendFeaturesAreZeroWithoutEnoughHistory() {
        SensorReading reading = SensorReading.builder().subsystemType(SubsystemType.SDP).subsystemId("SDP-01").build();

        Map<String, Object> features = featureService.enrich(reading, Map.of("room_temperature_c", 40.0), null);

        assertThat(features).containsEntry("temperature_change_c_per_hour", 0.0);
    }

    @Test
    void standbyGeneratorHasNoVoltageDeviationAndUpsUsesOutputVoltage() {
        SensorReading generator = SensorReading.builder().subsystemType(SubsystemType.GENERATOR).subsystemId("GENERATOR-01").build();
        Map<String, Object> standby = featureService.enrich(generator, Map.of(
                "running_status", "STANDBY",
                "voltage_L1", 0.0, "voltage_L2", 0.0, "voltage_L3", 0.0,
                "current_L1", 0.0, "current_L2", 0.0, "current_L3", 0.0));
        assertThat(standby)
                .containsEntry("voltage_deviation_pct", 0.0)
                .containsEntry("phase_current_imbalance_pct", 0.0);

        SensorReading ups = SensorReading.builder().subsystemType(SubsystemType.UPS).subsystemId("UPS-01").build();
        Map<String, Object> onBattery = featureService.enrich(ups, Map.of(
                "operational_status", "ON_BATTERY", "input_voltage_v", 0.0, "output_voltage_v", 230.0));
        assertThat(onBattery).containsEntry("voltage_deviation_pct", 0.0);
    }
}
