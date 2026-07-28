package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.DiagnosisActionResponse;
import com.faultmonitor.backend.dto.DiagnosisResponse;
import com.faultmonitor.backend.dto.EquipmentDiagnosisResponse;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.AlarmRepository;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiagnosisService {

    private static final List<AlarmStatus> UNRESOLVED = List.of(
            AlarmStatus.ACTIVE, AlarmStatus.ACKNOWLEDGED);

    private final AlarmRepository alarmRepository;
    private final EquipmentService equipmentService;
    private final Map<String, DiagnosisResponse> diagnoses;
    private final Map<String, String> failureTypeToAlarmCode;

    public DiagnosisService(AlarmRepository alarmRepository, EquipmentService equipmentService) {
        this.alarmRepository = alarmRepository;
        this.equipmentService = equipmentService;
        this.diagnoses = buildDiagnoses();
        this.failureTypeToAlarmCode = buildFailureTypeMap();
    }

    @Transactional(readOnly = true)
    public List<DiagnosisResponse> findAll() {
        return diagnoses.values().stream()
                .sorted(Comparator.comparing(DiagnosisResponse::key))
                .toList();
    }

    public Optional<DiagnosisResponse> findByAlarmCode(String alarmCode) {
        if (alarmCode == null || alarmCode.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(diagnoses.get(normalize(alarmCode)));
    }

    public DiagnosisResponse requireByKey(String key) {
        String normalized = normalize(key);
        String alarmCode = failureTypeToAlarmCode.getOrDefault(normalized, normalized);
        DiagnosisResponse diagnosis = diagnoses.get(alarmCode);
        if (diagnosis == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "DIAGNOSIS_NOT_FOUND",
                    "No diagnosis catalogue entry exists for " + key + ".");
        }
        return diagnosis;
    }

    @Transactional(readOnly = true)
    public List<EquipmentDiagnosisResponse> findForEquipment(Long equipmentId, boolean unresolved) {
        equipmentService.requireEquipment(equipmentId);
        List<Alarm> alarms = unresolved
                ? alarmRepository.findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
                        equipmentId, UNRESOLVED)
                : alarmRepository.findByEquipmentIdOrderBySeverityAscTriggeredAtDesc(equipmentId);
        return alarms.stream()
                .map(alarm -> {
                    DiagnosisResponse diagnosis = findByAlarmCode(alarm.getAlarmCode()).orElse(null);
                    return new EquipmentDiagnosisResponse(
                            com.faultmonitor.backend.dto.AlarmResponse.from(alarm, diagnosis), diagnosis);
                })
                .toList();
    }

    public Set<String> supportedAlarmCodes() {
        return diagnoses.keySet();
    }

    public Set<String> supportedFailureTypes() {
        return failureTypeToAlarmCode.keySet();
    }

    private Map<String, DiagnosisResponse> buildDiagnoses() {
        Map<String, DiagnosisResponse> entries = new LinkedHashMap<>();
        add(entries, "GEN_LOW_FUEL", "GEN_LOW_FUEL", true,
                "Fuel level declines below 20% and continues toward the critical range.",
                List.of("Fuel consumed during extended operation", "Fuel not replenished after testing"),
                List.of("Refill the day tank", "Inspect the supply line", "Update the refuelling schedule"));
        add(entries, "GEN_CRITICAL_FUEL", "GEN_LOW_FUEL", true,
                "Fuel level is below the critical 10% range.",
                List.of("Extended generator operation without refuelling", "Fuel supply process missed the critical threshold"),
                List.of("Refill the day tank immediately", "Inspect fuel supply and return lines", "Keep nonessential loads off until fuel is restored"));
        add(entries, "GEN_HIGH_TEMP", "GEN_OVERHEAT", true,
                "Room temperature rises with increasing phase-current imbalance and frequency variation.",
                List.of("Restricted ventilation", "Insufficient cooling during sustained generator operation"),
                List.of("Reduce load", "Inspect ventilation and coolant level", "Check radiator and cooling fans"));
        add(entries, "GEN_VOLTAGE_ABNORMAL", "GEN_VOLTAGE_INSTABILITY", true,
                "Phase voltage spread and frequency deviation increase before output becomes unstable.",
                List.of("Alternator voltage regulation instability", "Governor instability under changing load", "Loose phase connection"),
                List.of("Isolate nonessential load", "Inspect AVR and governor response", "Check phase connections"));
        add(entries, "GEN_FIRE", "FIRE_ALARM", false,
                "Digital fire input changes state with no dependable telemetry precursor.",
                List.of("Fire detector activation", "Fire-alarm circuit activation"),
                List.of("Follow the emergency response procedure", "Isolate power only when authorised", "Verify the affected generator room"));
        add(entries, "GEN_INTRUDER", "INTRUDER_ALARM", false,
                "Digital intrusion input changes state with no dependable telemetry precursor.",
                List.of("Unauthorised access", "Intrusion-sensor activation"),
                List.of("Verify access records", "Check camera coverage", "Dispatch authorised security staff"));
        add(entries, "GEN_FAULT", null, false,
                "Generator running status reports FAULT.",
                List.of("Fail-to-start condition", "Controller fault", "Protection interlock opened"),
                List.of("Review generator controller fault code", "Verify emergency stop and protection interlocks", "Escalate to generator technician"));
        add(entries, "ATS_TRANSFER_FAIL", "ATS_TRANSFER_FAILURE", true,
                "Mains becomes unavailable while generator voltage is present, but transfer is not completed.",
                List.of("Transfer mechanism failure", "Control relay failure", "Emergency-stop interlock preventing source changeover"),
                List.of("Verify emergency-stop and interlocks", "Inspect transfer actuator and control relays", "Transfer manually if authorised"));
        add(entries, "ATS_MAINS_VOLTAGE", null, false,
                "Mains voltage is outside the safe operating band.",
                List.of("Utility supply instability", "Upstream breaker or feeder issue", "Measurement wiring issue"),
                List.of("Confirm mains voltage with a calibrated meter", "Inspect upstream feeder and breaker", "Hold transfer until voltage is stable"));
        add(entries, "ATS_FIRE", "FIRE_ALARM", false,
                "Digital fire input changes state with no dependable telemetry precursor.",
                List.of("Fire detector activation", "Fire-alarm circuit activation"),
                List.of("Follow the emergency response procedure", "Isolate ATS only when authorised", "Verify the ATS room"));
        add(entries, "ATS_INTRUDER", "INTRUDER_ALARM", false,
                "Digital intrusion input changes state with no dependable telemetry precursor.",
                List.of("Unauthorised access", "Intrusion-sensor activation"),
                List.of("Verify access records", "Check camera coverage", "Dispatch authorised security staff"));
        add(entries, "MDP_PHASE_VOLTAGE", "MDP_SUPPLY_LOSS", true,
                "Incoming phase voltage collapses or moves outside the safe range.",
                List.of("Upstream ATS did not forward power", "Loose phase connection", "Utility or generator source loss"),
                List.of("Restore the upstream source through the ATS", "Confirm all incoming phases", "Inspect MDP terminals before re-energising load"));
        add(entries, "MDP_PHASE_IMBALANCE", "MDP_PHASE_IMBALANCE", true,
                "One phase drifts while phase-current imbalance and cabinet temperature increase.",
                List.of("Uneven phase loading", "Loose or high-resistance phase connection"),
                List.of("Redistribute load", "Inspect terminals for heating", "Torque connections to specification"));
        add(entries, "MDP_FIRE", "FIRE_ALARM", false,
                "Digital fire input changes state with no dependable telemetry precursor.",
                List.of("Fire detector activation", "Fire-alarm circuit activation"),
                List.of("Follow the emergency response procedure", "Isolate MDP only when authorised", "Verify the MDP room"));
        add(entries, "MDP_INTRUDER", "INTRUDER_ALARM", false,
                "Digital intrusion input changes state with no dependable telemetry precursor.",
                List.of("Unauthorised access", "Intrusion-sensor activation"),
                List.of("Verify access records", "Check camera coverage", "Dispatch authorised security staff"));
        add(entries, "SDP_PHASE_VOLTAGE", "SDP_BREAKER_TRIP", true,
                "Local phase voltage falls outside the safe range and may follow rising load or upstream supply loss.",
                List.of("Sustained overload", "Downstream short-circuit condition", "Loss of upstream MDP supply"),
                List.of("Keep the breaker open if tripped", "Isolate downstream circuits", "Confirm upstream phases before reset"));
        add(entries, "SDP_FIRE", "FIRE_ALARM", false,
                "Digital fire input changes state with no dependable telemetry precursor.",
                List.of("Fire detector activation", "Fire-alarm circuit activation"),
                List.of("Follow the emergency response procedure", "Isolate SDP only when authorised", "Verify the SDP room"));
        add(entries, "SDP_INTRUDER", "INTRUDER_ALARM", false,
                "Digital intrusion input changes state with no dependable telemetry precursor.",
                List.of("Unauthorised access", "Intrusion-sensor activation"),
                List.of("Verify access records", "Check camera coverage", "Dispatch authorised security staff"));
        add(entries, "UPS_BATTERY_LOW", "UPS_BATTERY_DEGRADATION", true,
                "Battery charge is below 40% or runtime declines faster than expected.",
                List.of("Current charge depletion", "Reduced battery capacity", "Incomplete charging"),
                List.of("Restore charging source", "Run a controlled battery test", "Inspect and replace weak battery modules"));
        add(entries, "UPS_BATTERY_CRITICAL", "UPS_BATTERY_DEGRADATION", true,
                "Battery charge is below 20% and runtime is close to exhaustion.",
                List.of("Extended battery operation", "Reduced battery capacity", "Charging circuit issue"),
                List.of("Shed nonessential load", "Restore upstream power immediately", "Prepare controlled shutdown if runtime is insufficient"));
        add(entries, "UPS_HIGH_LOAD", "UPS_OVERLOAD", true,
                "Load rises above 80%, temperature increases and estimated runtime falls.",
                List.of("Excess connected load", "Failed load distribution"),
                List.of("Remove noncritical load", "Verify connected equipment", "Redistribute load between UPS units"));
        add(entries, "UPS_ON_BATTERY", "UPS_INPUT_POWER_LOSS", true,
                "Input voltage disappears and the UPS changes to battery operation.",
                List.of("Upstream breaker trip", "Common distribution supply loss", "Normal transfer interval lasting too long"),
                List.of("Restore upstream breaker or source", "Shed nonessential load if runtime is low", "Confirm ATS transfer status"));
        add(entries, "UPS_FAULT", null, false,
                "UPS operational status reports FAULT.",
                List.of("Internal UPS module fault", "Battery system fault", "Inverter or bypass fault"),
                List.of("Read the UPS front-panel fault code", "Move protected load to bypass if authorised", "Escalate to UPS technician"));
        return Map.copyOf(entries);
    }

    private Map<String, String> buildFailureTypeMap() {
        return Map.ofEntries(
                Map.entry("GEN_LOW_FUEL", "GEN_LOW_FUEL"),
                Map.entry("GEN_OVERHEAT", "GEN_HIGH_TEMP"),
                Map.entry("GEN_VOLTAGE_INSTABILITY", "GEN_VOLTAGE_ABNORMAL"),
                Map.entry("ATS_TRANSFER_FAILURE", "ATS_TRANSFER_FAIL"),
                Map.entry("MDP_SUPPLY_LOSS", "MDP_PHASE_VOLTAGE"),
                Map.entry("MDP_PHASE_IMBALANCE", "MDP_PHASE_IMBALANCE"),
                Map.entry("SDP_BREAKER_TRIP", "SDP_PHASE_VOLTAGE"),
                Map.entry("SDP_SUPPLY_LOSS", "SDP_PHASE_VOLTAGE"),
                Map.entry("UPS_INPUT_POWER_LOSS", "UPS_ON_BATTERY"),
                Map.entry("UPS_BATTERY_DEGRADATION", "UPS_BATTERY_LOW"),
                Map.entry("UPS_OVERLOAD", "UPS_HIGH_LOAD"),
                Map.entry("FIRE_ALARM", "GEN_FIRE"),
                Map.entry("INTRUDER_ALARM", "GEN_INTRUDER"));
    }

    private void add(
            Map<String, DiagnosisResponse> entries,
            String alarmCode,
            String sourceFailureType,
            boolean predictable,
            String observablePattern,
            List<String> probableCauses,
            List<String> correctiveActions) {
        List<DiagnosisActionResponse> actions = correctiveActions.stream()
                .map(action -> new DiagnosisActionResponse(correctiveActions.indexOf(action) + 1, action))
                .toList();
        entries.put(normalize(alarmCode), new DiagnosisResponse(
                normalize(alarmCode),
                "ALARM_CODE",
                observablePattern,
                probableCauses,
                actions,
                sourceFailureType,
                predictable));
    }

    private String normalize(String value) {
        return value.trim().toUpperCase(Locale.ROOT);
    }
}
