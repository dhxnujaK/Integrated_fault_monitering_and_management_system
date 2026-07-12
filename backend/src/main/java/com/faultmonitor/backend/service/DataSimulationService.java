package com.faultmonitor.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.time.LocalDateTime;
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

    private static final String GENERATOR_ID = "GENERATOR-01";
    private static final String ATS_ID = "ATS-01";
    private static final String MDP_ID = "MDP-01";
    private static final String SDP_01_ID = "SDP-01";
    private static final String SDP_02_ID = "SDP-02";

    private final SensorReadingRepository sensorReadingRepository;
    private final AlarmService alarmService;
    private final ObjectMapper objectMapper;

    private final AtomicInteger generatorTicks = new AtomicInteger();
    private final AtomicInteger atsTicks = new AtomicInteger();
    private final AtomicInteger mdpTicks = new AtomicInteger();
    private double generatorFuelLevel = 100.0;

    @Scheduled(fixedRate = 5000)
    public void simulateGenerator() {
        int tick = generatorTicks.incrementAndGet();
        generatorFuelLevel = Math.max(0.0, generatorFuelLevel - 0.01);
        if (tick % 500 == 0) {
            generatorFuelLevel = Math.max(0.0, generatorFuelLevel - 5.0);
        }

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

        saveReading(SubsystemType.GENERATOR, GENERATOR_ID, data);
        alarmService.checkGenerator(data);
    }

    @Scheduled(fixedRate = 5000)
    public void simulateATS() {
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

        saveReading(SubsystemType.ATS, ATS_ID, data);
        alarmService.checkATS(data);
    }

    @Scheduled(fixedRate = 5000)
    public void simulateMDP() {
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

        saveReading(SubsystemType.MDP, MDP_ID, data);
        alarmService.checkMDP(data);
    }

    @Scheduled(fixedRate = 5000)
    public void simulateSDP() {
        simulateSingleSDP(SDP_01_ID);
        simulateSingleSDP(SDP_02_ID);
    }

    private void simulateSingleSDP(String subsystemId) {
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

        saveReading(SubsystemType.SDP, subsystemId, data);
        alarmService.checkSDP(data, subsystemId);
    }

    private void saveReading(SubsystemType subsystemType, String subsystemId, Map<String, Object> data) {
        try {
            sensorReadingRepository.save(SensorReading.builder()
                    .subsystemType(subsystemType)
                    .subsystemId(subsystemId)
                    .readingData(objectMapper.writeValueAsString(data))
                    .build());
        } catch (JsonProcessingException ex) {
            log.warn("Skipping simulated {} reading for {} because JSON serialization failed.",
                    subsystemType, subsystemId, ex);
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
