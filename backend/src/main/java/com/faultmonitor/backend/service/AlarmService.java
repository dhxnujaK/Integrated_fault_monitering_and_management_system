package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.AlarmResponse;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AlarmService {

    private static final double MIN_PHASE_VOLTAGE = 207.0;
    private static final double MAX_PHASE_VOLTAGE = 253.0;
    private static final double GENERATOR_LOW_FUEL = 20.0;
    private static final double GENERATOR_CRITICAL_FUEL = 10.0;
    private static final double GENERATOR_HIGH_TEMP = 45.0;
    private static final double PHASE_IMBALANCE_LIMIT = 5.0;
    private static final double UPS_LOW_BATTERY = 40.0;
    private static final double UPS_CRITICAL_BATTERY = 20.0;
    private static final double UPS_HIGH_LOAD = 80.0;
    private static final List<AlarmStatus> UNRESOLVED = List.of(
            AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED);

    private final AlarmRepository alarmRepository;
    private final UserRepository userRepository;
    private final EquipmentService equipmentService;
    private final DiagnosisService diagnosisService;

    @Transactional
    public void checkGenerator(Equipment equipment, Map<String, Object> data) {
        synchronizeCondition(equipment, "GEN_LOW_FUEL", "Generator fuel level is below 20%.", AlarmSeverity.WARNING,
                lessThan(data, "fuel_level_pct", GENERATOR_LOW_FUEL));
        synchronizeCondition(equipment, "GEN_CRITICAL_FUEL", "Generator fuel level is below 10%.", AlarmSeverity.CRITICAL,
                lessThan(data, "fuel_level_pct", GENERATOR_CRITICAL_FUEL));
        synchronizeCondition(equipment, "GEN_VOLTAGE_ABNORMAL", "Generator phase voltage is outside the safe range.",
                AlarmSeverity.WARNING, generatorOutputActive(data)
                        && voltageAbnormal(data, "voltage_L1", "voltage_L2", "voltage_L3"));
        synchronizeCondition(equipment, "GEN_HIGH_TEMP", "Generator room temperature is above 45C.", AlarmSeverity.WARNING,
                greaterThan(data, "room_temperature_c", GENERATOR_HIGH_TEMP));
        synchronizeCondition(equipment, "GEN_FIRE", "Generator fire alarm is active.", AlarmSeverity.CRITICAL,
                bool(data, "fire_alarm"));
        synchronizeCondition(equipment, "GEN_INTRUDER", "Generator intruder alarm is active.", AlarmSeverity.WARNING,
                bool(data, "intruder_alarm"));
        synchronizeCondition(equipment, "GEN_FAULT", "Generator running status is FAULT.", AlarmSeverity.CRITICAL,
                "FAULT".equals(string(data, "running_status")));
    }

    @Transactional
    public void checkATS(Equipment equipment, Map<String, Object> data) {
        synchronizeCondition(equipment, "ATS_TRANSFER_FAIL", "ATS transfer status is FAILED.", AlarmSeverity.CRITICAL,
                "FAILED".equals(string(data, "transfer_status")));
        synchronizeCondition(equipment, "ATS_MAINS_VOLTAGE", "ATS mains voltage is outside the safe range.",
                AlarmSeverity.WARNING, outsideSafeVoltage(number(data, "mains_voltage")));
        synchronizeCondition(equipment, "ATS_FIRE", "ATS fire alarm is active.", AlarmSeverity.CRITICAL,
                bool(data, "fire_alarm"));
        synchronizeCondition(equipment, "ATS_INTRUDER", "ATS intruder alarm is active.", AlarmSeverity.WARNING,
                bool(data, "intruder_alarm"));
    }

    @Transactional
    public void checkMDP(Equipment equipment, Map<String, Object> data) {
        synchronizeCondition(equipment, "MDP_PHASE_VOLTAGE", "MDP phase voltage is outside the safe range.",
                AlarmSeverity.WARNING, voltageAbnormal(data, "voltage_R", "voltage_Y", "voltage_B"));
        synchronizeCondition(equipment, "MDP_PHASE_IMBALANCE", "MDP phase voltage imbalance is above 5V.",
                AlarmSeverity.WARNING, phaseImbalance(data));
        synchronizeCondition(equipment, "MDP_FIRE", "MDP fire alarm is active.", AlarmSeverity.CRITICAL,
                bool(data, "fire_alarm"));
        synchronizeCondition(equipment, "MDP_INTRUDER", "MDP intruder alarm is active.", AlarmSeverity.WARNING,
                bool(data, "intruder_alarm"));
    }

    @Transactional
    public void checkSDP(Equipment equipment, Map<String, Object> data) {
        synchronizeCondition(equipment, "SDP_PHASE_VOLTAGE", "SDP phase voltage is outside the safe range.",
                AlarmSeverity.WARNING, voltageAbnormal(data, "voltage_R", "voltage_Y", "voltage_B"));
        synchronizeCondition(equipment, "SDP_FIRE", "SDP fire alarm is active.", AlarmSeverity.CRITICAL,
                bool(data, "fire_alarm"));
        synchronizeCondition(equipment, "SDP_INTRUDER", "SDP intruder alarm is active.", AlarmSeverity.WARNING,
                bool(data, "intruder_alarm"));
    }

    @Transactional
    public void checkUPS(Equipment equipment, Map<String, Object> data) {
        synchronizeCondition(equipment, "UPS_BATTERY_LOW", "UPS battery charge is below 40%.",
                AlarmSeverity.WARNING, lessThan(data, "battery_charge_pct", UPS_LOW_BATTERY));
        synchronizeCondition(equipment, "UPS_BATTERY_CRITICAL", "UPS battery charge is below 20%.",
                AlarmSeverity.CRITICAL, lessThan(data, "battery_charge_pct", UPS_CRITICAL_BATTERY));
        synchronizeCondition(equipment, "UPS_HIGH_LOAD", "UPS load is above 80%.",
                AlarmSeverity.WARNING, greaterThan(data, "load_pct", UPS_HIGH_LOAD));
        synchronizeCondition(equipment, "UPS_ON_BATTERY", "UPS is operating on battery power.",
                AlarmSeverity.WARNING, "ON_BATTERY".equals(string(data, "operational_status")));
        synchronizeCondition(equipment, "UPS_FAULT", "UPS operational status is FAULT.",
                AlarmSeverity.CRITICAL, "FAULT".equals(string(data, "operational_status")));
    }

    @Transactional
    public AlarmResponse acknowledge(Long alarmId, String note, String username) {
        Alarm alarm = alarmRepository.findById(alarmId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ALARM_NOT_FOUND",
                        "Alarm was not found."));
        if (alarm.getStatus() != AlarmStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_ALARM_TRANSITION",
                    "Only an active alarm can be acknowledged.");
        }
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                        "Authenticated user was not found."));
        alarm.setStatus(AlarmStatus.ACKNOWLEDGED);
        alarm.setAcknowledgedAt(LocalDateTime.now());
        alarm.setAcknowledgedBy(user);
        alarm.setAcknowledgementNote(note == null || note.isBlank() ? null : note.trim());
        return AlarmResponse.from(alarm, diagnosisService.findByAlarmCode(alarm.getAlarmCode()).orElse(null));
    }

    @Transactional(readOnly = true)
    public PageResponse<AlarmResponse> findAll(
            AlarmStatus status,
            Boolean unresolved,
            SubsystemType equipmentType,
            Long equipmentId,
            AlarmSeverity severity,
            Instant from,
            Instant to,
            int page,
            int size) {
        if (status != null && unresolved != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "Status and unresolved filters cannot be used together.");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "The from timestamp must not be after the to timestamp.");
        }
        Specification<Alarm> specification = filters(
                status, unresolved, equipmentType, equipmentId, severity, from, to);
        Page<AlarmResponse> alarms = alarmRepository.findAll(specification, PageRequest.of(
                        page, size, Sort.by(Sort.Order.asc("severity"), Sort.Order.desc("triggeredAt"))))
                .map(alarm -> AlarmResponse.from(
                        alarm, diagnosisService.findByAlarmCode(alarm.getAlarmCode()).orElse(null)));
        return PageResponse.from(alarms);
    }

    @Transactional(readOnly = true)
    public List<AlarmResponse> findForEquipment(Long equipmentId, boolean unresolved) {
        equipmentService.requireEquipment(equipmentId);
        List<Alarm> alarms = unresolved
                ? alarmRepository.findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
                        equipmentId, UNRESOLVED)
                : alarmRepository.findByEquipmentIdOrderBySeverityAscTriggeredAtDesc(equipmentId);
        return alarms.stream()
                .map(alarm -> AlarmResponse.from(
                        alarm, diagnosisService.findByAlarmCode(alarm.getAlarmCode()).orElse(null)))
                .toList();
    }

    /** Shared lifecycle primitive used by equipment-specific threshold evaluators. */
    @Transactional
    public void synchronizeCondition(
            Equipment equipment,
            String alarmCode,
            String alarmMessage,
            AlarmSeverity severity,
            boolean conditionActive) {
        List<Alarm> existing = alarmRepository.findByEquipmentIdAndAlarmCodeAndStatusIn(
                equipment.getId(), alarmCode, UNRESOLVED);
        if (conditionActive && existing.isEmpty()) {
            alarmRepository.save(Alarm.builder()
                    .subsystemType(equipment.getEquipmentType())
                    .subsystemId(equipment.getEquipmentCode())
                    .equipment(equipment)
                    .alarmCode(alarmCode)
                    .alarmMessage(alarmMessage)
                    .severity(severity)
                    .status(AlarmStatus.ACTIVE)
                    .build());
        } else if (!conditionActive && !existing.isEmpty()) {
            LocalDateTime resolvedAt = LocalDateTime.now();
            existing.forEach(alarm -> {
                alarm.setStatus(AlarmStatus.RESOLVED);
                alarm.setResolvedAt(resolvedAt);
            });
        }
    }

    private Specification<Alarm> filters(
            AlarmStatus status,
            Boolean unresolved,
            SubsystemType equipmentType,
            Long equipmentId,
            AlarmSeverity severity,
            Instant from,
            Instant to) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(builder.equal(root.get("status"), status));
            } else if (Boolean.TRUE.equals(unresolved)) {
                predicates.add(root.get("status").in(UNRESOLVED));
            } else if (Boolean.FALSE.equals(unresolved)) {
                predicates.add(builder.equal(root.get("status"), AlarmStatus.RESOLVED));
            }
            if (equipmentType != null) {
                predicates.add(builder.equal(root.get("subsystemType"), equipmentType));
            }
            if (equipmentId != null) {
                predicates.add(builder.equal(root.get("equipment").get("id"), equipmentId));
            }
            if (severity != null) {
                predicates.add(builder.equal(root.get("severity"), severity));
            }
            if (from != null) {
                predicates.add(builder.greaterThanOrEqualTo(
                        root.get("triggeredAt"), LocalDateTime.ofInstant(from, ZoneId.systemDefault())));
            }
            if (to != null) {
                predicates.add(builder.lessThanOrEqualTo(
                        root.get("triggeredAt"), LocalDateTime.ofInstant(to, ZoneId.systemDefault())));
            }
            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private boolean voltageAbnormal(Map<String, Object> data, String... keys) {
        for (String key : keys) {
            if (outsideSafeVoltage(number(data, key))) {
                return true;
            }
        }
        return false;
    }

    private boolean generatorOutputActive(Map<String, Object> data) {
        if ("RUNNING".equals(string(data, "running_status"))) {
            return true;
        }
        for (String key : List.of("voltage_L1", "voltage_L2", "voltage_L3")) {
            Double voltage = number(data, key);
            if (voltage != null && voltage > 1.0) {
                return true;
            }
        }
        return false;
    }

    private boolean outsideSafeVoltage(Double voltage) {
        return voltage != null && (voltage < MIN_PHASE_VOLTAGE || voltage > MAX_PHASE_VOLTAGE);
    }

    private boolean phaseImbalance(Map<String, Object> data) {
        Double r = number(data, "voltage_R");
        Double y = number(data, "voltage_Y");
        Double b = number(data, "voltage_B");
        if (r == null || y == null || b == null) {
            return false;
        }
        double max = Math.max(r, Math.max(y, b));
        double min = Math.min(r, Math.min(y, b));
        return max - min > PHASE_IMBALANCE_LIMIT;
    }

    private boolean lessThan(Map<String, Object> data, String key, double limit) {
        Double value = number(data, key);
        return value != null && value < limit;
    }

    private boolean greaterThan(Map<String, Object> data, String key, double limit) {
        Double value = number(data, key);
        return value != null && value > limit;
    }

    private Double number(Map<String, Object> data, String key) {
        Object value = data.get(key);
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

    private boolean bool(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value instanceof Boolean flag ? flag
                : value instanceof String text && Boolean.parseBoolean(text);
    }

    private String string(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value == null ? "" : String.valueOf(value);
    }
}
