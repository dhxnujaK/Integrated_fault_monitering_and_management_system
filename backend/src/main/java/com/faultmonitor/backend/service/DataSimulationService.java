package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Local development sensor simulator.
 *
 * <p>Readings follow the same behaviour as the ML training dataset
 * ({@code ml-service/scripts/generate_training_dataset.mjs}): normal operation, a gradual
 * precursor that builds before each failure, the failure itself, then recovery. Each tick
 * represents one 5-minute sample and is emitted every {@code simulation.tick-interval-ms}
 * (default 5 s), so a training-length precursor of four hours plays out in about 4 minutes
 * and one full cycle per equipment takes about 11 minutes.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "simulation.enabled", havingValue = "true")
public class DataSimulationService {

    private static final int NORMAL_TICKS = 48;
    private static final int PRECURSOR_TICKS = 48;
    private static final int FAULT_TICKS = 12;
    private static final int RECOVERY_TICKS = 24;
    private static final int CYCLE_TICKS = NORMAL_TICKS + PRECURSOR_TICKS + FAULT_TICKS + RECOVERY_TICKS;
    private static final double FULL_FUEL = 88.0;

    private static final List<String> GENERATOR_FAULTS = List.of("GEN_LOW_FUEL", "GEN_OVERHEAT", "GEN_VOLTAGE_INSTABILITY");
    private static final List<String> ATS_FAULTS = List.of("ATS_TRANSFER_FAILURE");
    private static final List<String> MDP_FAULTS = List.of("MDP_PHASE_IMBALANCE");
    private static final List<String> SDP_FAULTS = List.of("SDP_BREAKER_TRIP");
    private static final List<String> UPS_FAULTS = List.of("UPS_OVERLOAD", "UPS_BATTERY_DEGRADATION");

    private final SensorReadingRepository sensorReadingRepository;
    private final EquipmentRepository equipmentRepository;
    private final AlarmService alarmService;
    private final ObjectMapper objectMapper;

    private final Map<Long, Scenario> scenarios = new ConcurrentHashMap<>();
    private volatile boolean generatorSupplyingLoad;

    @Value("${simulation.fault-injection.enabled:false}")
    private boolean faultInjectionEnabled;

    private enum Phase { NORMAL, PRECURSOR, FAULT, RECOVERY }

    /** Per-equipment position in its fault cycle. */
    private static final class Scenario {
        private int tick;
        private double curvePower = 1.0;
        private double magnitude = 1.0;
        private double fuel = FULL_FUEL;
    }

    private record Step(Phase phase, double progress, String faultType, double magnitude, Scenario state) {
        boolean is(Phase expected, String type) {
            return phase == expected && type.equals(faultType);
        }

        boolean during(String type) {
            return type.equals(faultType) && (phase == Phase.PRECURSOR || phase == Phase.FAULT);
        }

        /** Precursor progress, held at full strength while the failure is active. */
        double ramp() {
            return phase == Phase.FAULT ? 1.0 : phase == Phase.PRECURSOR ? progress : 0.0;
        }
    }

    @Scheduled(fixedRateString = "${simulation.tick-interval-ms:5000}")
    public void simulate() {
        enabledEquipment(SubsystemType.GENERATOR).forEach(this::simulateGenerator);
        enabledEquipment(SubsystemType.ATS).forEach(this::simulateATS);
        enabledEquipment(SubsystemType.MDP).forEach(equipment -> simulatePanel(equipment, true));
        enabledEquipment(SubsystemType.SDP).forEach(equipment -> simulatePanel(equipment, false));
        enabledEquipment(SubsystemType.UPS).forEach(this::simulateUPS);
    }

    private void simulateGenerator(Equipment equipment) {
        Step step = advance(equipment, GENERATOR_FAULTS, false);
        Scenario state = step.state();
        boolean lowFuel = "GEN_LOW_FUEL".equals(step.faultType());
        boolean running = step.phase() == Phase.PRECURSOR
                || (step.phase() == Phase.FAULT && !lowFuel)
                || (step.phase() == Phase.RECOVERY && lowFuel);
        generatorSupplyingLoad = running && lowFuel;

        double ramp = step.ramp();
        double load = running ? dailyLoad(38, 13) : 0;
        double voltageBase = running ? 230 : 0;
        double voltageSpread = running ? 0.9 : 0;
        double frequency = running ? 50 + gaussian(0.06) : 0;
        double temperature = running ? 31 + load * 0.08 + gaussian(0.45) : 28 + gaussian(0.5);
        if (step.during("GEN_OVERHEAT")) {
            temperature = 34 + 20 * step.magnitude() * ramp + gaussian(0.35);
            frequency += ramp * gaussian(0.35);
            voltageSpread = 0.9 + ramp * 3.8 * step.magnitude();
        } else if (step.during("GEN_VOLTAGE_INSTABILITY")) {
            voltageBase = 230 - 27 * step.magnitude() * ramp;
            voltageSpread = 1 + 9 * step.magnitude() * ramp;
            frequency = 50 - 2.4 * step.magnitude() * ramp + gaussian(0.12 + ramp * 0.25);
        }

        if (lowFuel && step.phase() == Phase.PRECURSOR) {
            state.fuel = FULL_FUEL - (FULL_FUEL - 2.5) * step.progress();
        } else if (lowFuel && step.phase() == Phase.FAULT) {
            state.fuel = 2.5;
        } else if (lowFuel && step.phase() == Phase.RECOVERY) {
            state.fuel = Math.min(FULL_FUEL, state.fuel + 7);
        } else if (step.phase() == Phase.NORMAL) {
            state.fuel = FULL_FUEL;
        }

        String status = step.phase() == Phase.FAULT ? "FAULT" : running ? "RUNNING" : "STANDBY";
        double[] voltages = running ? phases(voltageBase, voltageSpread) : new double[3];
        double[] currents = running ? currents(load, 1.0 + ramp * 1.5) : new double[3];

        Map<String, Object> data = new LinkedHashMap<>();
        putPhases(data, "voltage_L", new String[] {"1", "2", "3"}, voltages);
        putPhases(data, "current_L", new String[] {"1", "2", "3"}, currents);
        data.put("fuel_level_pct", round(clamp(state.fuel + gaussian(0.08), 0, 100)));
        data.put("frequency_hz", round(frequency));
        data.put("running_status", status);
        data.put("breaker_status", running ? "CLOSED" : "OPEN");
        data.put("room_temperature_c", round(temperature));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        alarmService.checkGenerator(equipment, data);
    }

    /** ATS transfer failures are sudden in the training data, so there is no precursor phase. */
    private void simulateATS(Equipment equipment) {
        Step step = advance(equipment, ATS_FAULTS, true);
        boolean transferFailed = step.phase() == Phase.FAULT;
        boolean onGenerator = generatorSupplyingLoad;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("active_source", onGenerator ? "GENERATOR" : "MAINS");
        data.put("mains_voltage", onGenerator ? 0.0 : round(230 + gaussian(0.6)));
        data.put("generator_voltage", onGenerator ? round(230 + gaussian(0.9)) : 0.0);
        data.put("transfer_status", transferFailed ? "FAILED" : "NORMAL");
        data.put("breaker_status", "CLOSED");
        data.put("last_transfer_at", transferFailed ? LocalDateTime.now().toString() : null);
        data.put("room_temperature_c", round(26 + gaussian(0.45)));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        alarmService.checkATS(equipment, data);
    }

    private void simulatePanel(Equipment equipment, boolean mainPanel) {
        Step step = advance(equipment, mainPanel ? MDP_FAULTS : SDP_FAULTS, false);
        double ramp = step.ramp();
        double scale = step.magnitude();
        double baseCurrent = mainPanel ? dailyLoad(62, 24) : dailyLoad(25, 13);
        double temperature = 28 + baseCurrent * 0.035 + gaussian(0.45);
        double[] voltages = phases(230, 0.75);
        double[] currents = currents(baseCurrent, 1.2);
        String breaker = "CLOSED";

        if (step.during("MDP_PHASE_IMBALANCE")) {
            voltages[0] -= 22 * scale * ramp;
            voltages[1] += 4 * scale * ramp;
            currents[0] += 22 * scale * ramp;
            currents[2] = Math.max(0, currents[2] - 8 * scale * ramp);
            temperature += 8 * scale * ramp;
        } else if (step.is(Phase.PRECURSOR, "SDP_BREAKER_TRIP")) {
            currents = currents(baseCurrent + 52 * scale * ramp, 2.0 + 2.5 * ramp);
            temperature += 16 * scale * ramp;
        } else if (step.is(Phase.FAULT, "SDP_BREAKER_TRIP")) {
            voltages = new double[3];
            currents = new double[3];
            breaker = "OPEN";
            temperature += 10 * scale;
        } else if (step.phase() == Phase.RECOVERY) {
            temperature += 7 * scale * (1 - step.progress());
        }

        Map<String, Object> data = new LinkedHashMap<>();
        putPhases(data, "voltage_", new String[] {"R", "Y", "B"}, voltages);
        putPhases(data, "current_", new String[] {"R", "Y", "B"}, currents);
        data.put(mainPanel ? "main_breaker_status" : "breaker_status", breaker);
        data.put("room_temperature_c", round(temperature));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        if (mainPanel) {
            alarmService.checkMDP(equipment, data);
        } else {
            alarmService.checkSDP(equipment, data);
        }
    }

    private void simulateUPS(Equipment equipment) {
        Step step = advance(equipment, UPS_FAULTS, false);
        double ramp = step.ramp();
        double scale = step.magnitude();
        double load = dailyLoad(40, 14) + gaussian(0.8);
        double charge = 96;
        double batteryVoltage = 52.2 + gaussian(0.08);
        double temperature = 27 + load * 0.055 + gaussian(0.35);
        double runtime = charge / 100 * clamp(6000 / Math.max(load, 10), 45, 180) + gaussian(1.4);
        String status = "ONLINE";
        String faultCode = null;

        if (step.during("UPS_OVERLOAD")) {
            load = 58 + 43 * scale * ramp + gaussian(0.7);
            temperature += 13 * scale * ramp;
            runtime = clamp(charge / 100 * clamp(6000 / Math.max(load, 10), 45, 180) - 22 * scale * ramp + gaussian(1), 2, 180);
            if (step.phase() == Phase.FAULT) {
                status = "FAULT";
                faultCode = "OUTPUT_OVERLOAD";
            }
        } else if (step.during("UPS_BATTERY_DEGRADATION")) {
            batteryVoltage = 52.1 - 4.6 * scale * ramp + gaussian(0.06);
            runtime = 82 - 68 * scale * ramp + gaussian(0.8);
            temperature += 7 * scale * ramp;
            if (step.phase() == Phase.FAULT) {
                status = "FAULT";
                faultCode = "BATTERY_CAPACITY_LOW";
            }
        } else if (step.phase() == Phase.RECOVERY) {
            temperature += 5 * scale * (1 - step.progress());
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("operational_status", status);
        data.put("battery_charge_pct", round(charge + gaussian(0.06)));
        data.put("battery_voltage_v", round(batteryVoltage));
        data.put("input_voltage_v", round(230 + gaussian(0.6)));
        data.put("output_voltage_v", round(230 + gaussian(0.45)));
        data.put("load_pct", round(clamp(load, 0, 120)));
        data.put("estimated_runtime_min", Math.round(Math.max(0, runtime) * 10) / 10.0);
        data.put("temperature_c", round(temperature));
        data.put("fault_code", faultCode);

        saveReading(equipment, data);
        alarmService.checkUPS(equipment, data);
    }

    /** Moves the equipment one tick through its cycle; cycles are staggered between equipment. */
    private Step advance(Equipment equipment, List<String> faults, boolean sudden) {
        Scenario state = scenarios.computeIfAbsent(equipment.getId(), id -> {
            Scenario scenario = new Scenario();
            scenario.tick = (int) Math.floorMod(id * 41L, CYCLE_TICKS);
            return scenario;
        });
        int tick = state.tick++;
        if (!faultInjectionEnabled) {
            return new Step(Phase.NORMAL, 0, null, 1, state);
        }
        int position = Math.floorMod(tick, CYCLE_TICKS);
        String faultType = faults.get(Math.floorMod(tick / CYCLE_TICKS, faults.size()));
        if (position == 0) {
            state.curvePower = 0.75 + random().nextDouble() * 0.75;
            state.magnitude = 0.85 + random().nextDouble() * 0.3;
        }

        int precursorEnd = NORMAL_TICKS + PRECURSOR_TICKS;
        int faultEnd = precursorEnd + FAULT_TICKS;
        if (position < NORMAL_TICKS || (sudden && position < precursorEnd)) {
            return new Step(Phase.NORMAL, 0, faultType, state.magnitude, state);
        }
        if (position < precursorEnd) {
            double linear = (position - NORMAL_TICKS) / (double) PRECURSOR_TICKS;
            return new Step(Phase.PRECURSOR, Math.pow(linear, state.curvePower), faultType, state.magnitude, state);
        }
        if (position < faultEnd) {
            return new Step(Phase.FAULT, 1, faultType, state.magnitude, state);
        }
        return new Step(Phase.RECOVERY, (position - faultEnd) / (double) RECOVERY_TICKS, faultType, state.magnitude, state);
    }

    private List<Equipment> enabledEquipment(SubsystemType type) {
        return equipmentRepository.findByEnabledTrueAndEquipmentType(type);
    }

    private void saveReading(Equipment equipment, Map<String, Object> data) {
        try {
            sensorReadingRepository.save(SensorReading.builder()
                    .subsystemType(equipment.getEquipmentType())
                    .subsystemId(equipment.getEquipmentCode())
                    .equipment(equipment)
                    .readingData(objectMapper.writeValueAsString(data))
                    .build());
        } catch (JsonProcessingException ex) {
            log.warn("Skipping simulated {} reading for {} because JSON serialization failed.",
                    equipment.getEquipmentType(), equipment.getEquipmentCode(), ex);
        }
    }

    /** Load that rises during the day, as in the training data. */
    private double dailyLoad(double base, double amplitude) {
        LocalTime now = LocalTime.now();
        double hour = now.getHour() + now.getMinute() / 60.0;
        return base + amplitude * Math.max(0, Math.sin((hour - 6) / 24 * 2 * Math.PI));
    }

    private double[] phases(double base, double spread) {
        return new double[] {base + gaussian(spread), base + gaussian(spread), base + gaussian(spread)};
    }

    private double[] currents(double base, double spread) {
        double[] values = phases(base, spread);
        for (int index = 0; index < values.length; index++) {
            values[index] = Math.max(0, values[index]);
        }
        return values;
    }

    private void putPhases(Map<String, Object> data, String prefix, String[] suffixes, double[] values) {
        for (int index = 0; index < suffixes.length; index++) {
            data.put(prefix + suffixes[index], round(values[index]));
        }
    }

    private double gaussian(double standardDeviation) {
        return random().nextGaussian() * standardDeviation;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private ThreadLocalRandom random() {
        return ThreadLocalRandom.current();
    }
}
