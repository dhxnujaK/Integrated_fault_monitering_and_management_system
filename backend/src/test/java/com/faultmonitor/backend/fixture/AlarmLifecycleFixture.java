package com.faultmonitor.backend.fixture;

import java.util.LinkedHashMap;
import java.util.Map;

/** Repeatable demo inputs for trigger, acknowledgement, clear and retrigger scenarios. */
public final class AlarmLifecycleFixture {

    private AlarmLifecycleFixture() {
    }

    public static Map<String, Object> generatorWithFuelLevel(double fuelLevel) {
        Map<String, Object> reading = new LinkedHashMap<>();
        reading.put("voltage_L1", 230.0);
        reading.put("voltage_L2", 230.0);
        reading.put("voltage_L3", 230.0);
        reading.put("fuel_level_pct", fuelLevel);
        reading.put("running_status", "RUNNING");
        reading.put("room_temperature_c", 28.0);
        reading.put("intruder_alarm", false);
        reading.put("fire_alarm", false);
        return reading;
    }

    public static Map<String, Object> normalGenerator() {
        return generatorWithFuelLevel(80.0);
    }
}
