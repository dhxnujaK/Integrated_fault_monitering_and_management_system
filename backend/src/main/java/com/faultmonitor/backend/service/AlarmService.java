package com.faultmonitor.backend.service;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.AlarmRepository;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AlarmService {

    private static final double MIN_PHASE_VOLTAGE = 207.0;
    private static final double MAX_PHASE_VOLTAGE = 253.0;
    private static final double GENERATOR_LOW_FUEL = 20.0;
    private static final double GENERATOR_CRITICAL_FUEL = 10.0;
    private static final double GENERATOR_HIGH_TEMP = 45.0;
    private static final double PHASE_IMBALANCE_LIMIT = 5.0;

    private final AlarmRepository alarmRepository;

    public void checkGenerator(Map<String, Object> data) {
        String subsystemId = "GENERATOR-01";

        if (number(data, "fuel_level_pct") < GENERATOR_LOW_FUEL) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_LOW_FUEL",
                    "Generator fuel level is below 20%.", AlarmSeverity.WARNING);
        }
        if (number(data, "fuel_level_pct") < GENERATOR_CRITICAL_FUEL) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_CRITICAL_FUEL",
                    "Generator fuel level is below 10%.", AlarmSeverity.CRITICAL);
        }
        if (voltageAbnormal(data, "voltage_L1", "voltage_L2", "voltage_L3")) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_VOLTAGE_ABNORMAL",
                    "Generator phase voltage is outside the safe range.", AlarmSeverity.WARNING);
        }
        if (number(data, "room_temperature_c") > GENERATOR_HIGH_TEMP) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_HIGH_TEMP",
                    "Generator room temperature is above 45C.", AlarmSeverity.WARNING);
        }
        if (bool(data, "fire_alarm")) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_FIRE",
                    "Generator fire alarm is active.", AlarmSeverity.CRITICAL);
        }
        if (bool(data, "intruder_alarm")) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_INTRUDER",
                    "Generator intruder alarm is active.", AlarmSeverity.WARNING);
        }
        if ("FAULT".equals(string(data, "running_status"))) {
            createIfMissing(SubsystemType.GENERATOR, subsystemId, "GEN_FAULT",
                    "Generator running status is FAULT.", AlarmSeverity.CRITICAL);
        }
    }

    public void checkATS(Map<String, Object> data) {
        String subsystemId = "ATS-01";

        if ("FAILED".equals(string(data, "transfer_status"))) {
            createIfMissing(SubsystemType.ATS, subsystemId, "ATS_TRANSFER_FAIL",
                    "ATS transfer status is FAILED.", AlarmSeverity.CRITICAL);
        }
        if (outsideSafeVoltage(number(data, "mains_voltage"))) {
            createIfMissing(SubsystemType.ATS, subsystemId, "ATS_MAINS_VOLTAGE",
                    "ATS mains voltage is outside the safe range.", AlarmSeverity.WARNING);
        }
        if (bool(data, "fire_alarm")) {
            createIfMissing(SubsystemType.ATS, subsystemId, "ATS_FIRE",
                    "ATS fire alarm is active.", AlarmSeverity.CRITICAL);
        }
        if (bool(data, "intruder_alarm")) {
            createIfMissing(SubsystemType.ATS, subsystemId, "ATS_INTRUDER",
                    "ATS intruder alarm is active.", AlarmSeverity.WARNING);
        }
    }

    public void checkMDP(Map<String, Object> data) {
        String subsystemId = "MDP-01";

        if (voltageAbnormal(data, "voltage_R", "voltage_Y", "voltage_B")) {
            createIfMissing(SubsystemType.MDP, subsystemId, "MDP_PHASE_VOLTAGE",
                    "MDP phase voltage is outside the safe range.", AlarmSeverity.WARNING);
        }
        if (phaseImbalance(data)) {
            createIfMissing(SubsystemType.MDP, subsystemId, "MDP_PHASE_IMBALANCE",
                    "MDP phase voltage imbalance is above 5V.", AlarmSeverity.WARNING);
        }
        if (bool(data, "fire_alarm")) {
            createIfMissing(SubsystemType.MDP, subsystemId, "MDP_FIRE",
                    "MDP fire alarm is active.", AlarmSeverity.CRITICAL);
        }
        if (bool(data, "intruder_alarm")) {
            createIfMissing(SubsystemType.MDP, subsystemId, "MDP_INTRUDER",
                    "MDP intruder alarm is active.", AlarmSeverity.WARNING);
        }
    }

    public void checkSDP(Map<String, Object> data, String subsystemId) {
        if (voltageAbnormal(data, "voltage_R", "voltage_Y", "voltage_B")) {
            createIfMissing(SubsystemType.SDP, subsystemId, "SDP_PHASE_VOLTAGE",
                    "SDP phase voltage is outside the safe range.", AlarmSeverity.WARNING);
        }
        if (bool(data, "fire_alarm")) {
            createIfMissing(SubsystemType.SDP, subsystemId, "SDP_FIRE",
                    "SDP fire alarm is active.", AlarmSeverity.CRITICAL);
        }
        if (bool(data, "intruder_alarm")) {
            createIfMissing(SubsystemType.SDP, subsystemId, "SDP_INTRUDER",
                    "SDP intruder alarm is active.", AlarmSeverity.WARNING);
        }
    }

    private void createIfMissing(
            SubsystemType subsystemType,
            String subsystemId,
            String alarmCode,
            String alarmMessage,
            AlarmSeverity severity
    ) {
        boolean activeAlarmExists = alarmRepository
                .findByAlarmCodeAndSubsystemIdAndStatus(alarmCode, subsystemId, AlarmStatus.ACTIVE)
                .isPresent();

        if (!activeAlarmExists) {
            alarmRepository.save(Alarm.builder()
                    .subsystemType(subsystemType)
                    .subsystemId(subsystemId)
                    .alarmCode(alarmCode)
                    .alarmMessage(alarmMessage)
                    .severity(severity)
                    .status(AlarmStatus.ACTIVE)
                    .build());
        }
    }

    private boolean voltageAbnormal(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            if (outsideSafeVoltage(number(data, key))) {
                return true;
            }
        }
        return false;
    }

    private boolean outsideSafeVoltage(double voltage) {
        return voltage < MIN_PHASE_VOLTAGE || voltage > MAX_PHASE_VOLTAGE;
    }

    private boolean phaseImbalance(Map<String, Object> data) {
        double r = number(data, "voltage_R");
        double y = number(data, "voltage_Y");
        double b = number(data, "voltage_B");
        double max = Math.max(r, Math.max(y, b));
        double min = Math.min(r, Math.min(y, b));
        return max - min > PHASE_IMBALANCE_LIMIT;
    }

    private double number(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Double.parseDouble(text);
        }
        return 0.0;
    }

    private boolean bool(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value instanceof Boolean flag) {
            return flag;
        }
        if (value instanceof String text) {
            return Boolean.parseBoolean(text);
        }
        return false;
    }

    private String string(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value == null ? "" : String.valueOf(value);
    }
}
