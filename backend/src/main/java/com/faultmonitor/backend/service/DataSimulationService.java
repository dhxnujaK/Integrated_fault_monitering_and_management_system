package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "simulation.enabled", havingValue = "true")
public class DataSimulationService {

    private final SensorReadingRepository sensorReadingRepository;
    private final EquipmentRepository equipmentRepository;
    private final AlarmService alarmService;
    private final ObjectMapper objectMapper;

    private final AtomicInteger generatorTicks = new AtomicInteger();
    private final AtomicInteger atsTicks = new AtomicInteger();
    private final AtomicInteger mdpTicks = new AtomicInteger();
    private final Map<String, Double> generatorFuelLevels = new java.util.concurrent.ConcurrentHashMap<>();

    @Scheduled(fixedRate = 5000)
    public void simulateGenerator() {
        enabledEquipment(SubsystemType.GENERATOR).forEach(this::simulateGenerator);
    }

    private void simulateGenerator(Equipment equipment) {
        int tick = generatorTicks.incrementAndGet();
        double generatorFuelLevel = generatorFuelLevels.getOrDefault(equipment.getEquipmentCode(), 100.0);
        generatorFuelLevel = Math.max(0.0, generatorFuelLevel - 0.01);
        if (tick % 500 == 0) {
            generatorFuelLevel = Math.max(0.0, generatorFuelLevel - 5.0);
        }
        generatorFuelLevels.put(equipment.getEquipmentCode(), generatorFuelLevel);

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("voltage_L1", varied(230.0, 5.0));
        data.put("voltage_L2", varied(230.0, 5.0));
        data.put("voltage_L3", varied(230.0, 5.0));
        data.put("current_L1", varied(45.0, 3.0));
        data.put("current_L2", varied(45.0, 3.0));
        data.put("current_L3", varied(45.0, 3.0));
        data.put("fuel_level_pct", round(generatorFuelLevel));
        data.put("frequency_hz", varied(50.0, 0.5));
        data.put("running_status", "RUNNING");
        data.put("breaker_status", "CLOSED");
        data.put("room_temperature_c", varied(28.0, 2.0));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        alarmService.checkGenerator(data);
    }

    @Scheduled(fixedRate = 5000)
    public void simulateATS() {
        enabledEquipment(SubsystemType.ATS).forEach(this::simulateATS);
    }

    private void simulateATS(Equipment equipment) {
        int tick = atsTicks.incrementAndGet();
        boolean transferTest = tick % 200 >= 0 && tick % 200 < 10;

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("active_source", transferTest ? "GENERATOR" : "MAINS");
        data.put("mains_voltage", varied(230.0, 5.0));
        data.put("generator_voltage", varied(230.0, 5.0));
        data.put("transfer_status", "NORMAL");
        data.put("breaker_status", "CLOSED");
        data.put("last_transfer_at", transferTest ? LocalDateTime.now().toString() : null);
        data.put("room_temperature_c", varied(26.0, 2.0));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        alarmService.checkATS(data);
    }

    @Scheduled(fixedRate = 5000)
    public void simulateMDP() {
        enabledEquipment(SubsystemType.MDP).forEach(this::simulateMDP);
    }

    private void simulateMDP(Equipment equipment) {
        int tick = mdpTicks.incrementAndGet();
        boolean injectImbalance = tick % 300 == 0;

        double voltageR = varied(230.0, 5.0);
        double voltageY = varied(230.0, 5.0);
        double voltageB = varied(230.0, 5.0);
        if (injectImbalance) {
            voltageR += random().nextBoolean() ? 15.0 : -15.0;
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("voltage_R", round(voltageR));
        data.put("voltage_Y", round(voltageY));
        data.put("voltage_B", round(voltageB));
        data.put("current_R", varied(80.0, 3.0));
        data.put("current_Y", varied(80.0, 3.0));
        data.put("current_B", varied(80.0, 3.0));
        data.put("main_breaker_status", "CLOSED");
        data.put("room_temperature_c", varied(27.0, 2.0));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        alarmService.checkMDP(data);
    }

    @Scheduled(fixedRate = 5000)
    public void simulateSDP() {
        enabledEquipment(SubsystemType.SDP).forEach(this::simulateSingleSDP);
    }

    private void simulateSingleSDP(Equipment equipment) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("voltage_R", varied(228.0, 5.0));
        data.put("voltage_Y", varied(228.0, 5.0));
        data.put("voltage_B", varied(228.0, 5.0));
        data.put("current_R", varied(30.0, 3.0));
        data.put("current_Y", varied(30.0, 3.0));
        data.put("current_B", varied(30.0, 3.0));
        data.put("breaker_status", "CLOSED");
        data.put("room_temperature_c", varied(27.0, 2.0));
        data.put("intruder_alarm", false);
        data.put("fire_alarm", false);

        saveReading(equipment, data);
        alarmService.checkSDP(data, equipment.getEquipmentCode());
    }

    /** UPS alarm evaluation is intentionally left to Nethmini's lifecycle work. */
    @Scheduled(fixedRate = 5000)
    public void simulateUPS() {
        enabledEquipment(SubsystemType.UPS).forEach(this::simulateUPS);
    }

    private void simulateUPS(Equipment equipment) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("operational_status", "ONLINE");
        data.put("battery_charge_pct", varied(85.0, 3.0));
        data.put("battery_voltage_v", varied(48.0, 1.0));
        data.put("input_voltage_v", varied(230.0, 4.0));
        data.put("output_voltage_v", varied(230.0, 2.0));
        data.put("load_pct", varied(45.0, 5.0));
        data.put("estimated_runtime_min", Math.round(varied(120.0, 12.0)));
        data.put("temperature_c", varied(27.0, 2.0));
        data.put("fault_code", null);
        saveReading(equipment, data);
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

    private double varied(double baseValue, double maxVariation) {
        return round(baseValue + random().nextDouble(-maxVariation, maxVariation));
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private ThreadLocalRandom random() {
        return ThreadLocalRandom.current();
    }
}
