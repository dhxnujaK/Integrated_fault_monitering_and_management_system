package com.faultmonitor.backend.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.dto.DiagnosisResponse;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@Transactional
class DiagnosisServiceTests {

    private static final Set<String> ALARM_CODES_RAISED_BY_ALARM_SERVICE = Set.of(
            "GEN_LOW_FUEL",
            "GEN_CRITICAL_FUEL",
            "GEN_VOLTAGE_ABNORMAL",
            "GEN_HIGH_TEMP",
            "GEN_FIRE",
            "GEN_INTRUDER",
            "GEN_FAULT",
            "ATS_TRANSFER_FAIL",
            "ATS_MAINS_VOLTAGE",
            "ATS_FIRE",
            "ATS_INTRUDER",
            "MDP_PHASE_VOLTAGE",
            "MDP_PHASE_IMBALANCE",
            "MDP_FIRE",
            "MDP_INTRUDER",
            "SDP_PHASE_VOLTAGE",
            "SDP_FIRE",
            "SDP_INTRUDER",
            "UPS_BATTERY_LOW",
            "UPS_BATTERY_CRITICAL",
            "UPS_HIGH_LOAD",
            "UPS_ON_BATTERY",
            "UPS_FAULT");

    private static final Set<String> PREDICTED_FAILURE_TYPES = Set.of(
            "GEN_LOW_FUEL",
            "GEN_OVERHEAT",
            "GEN_VOLTAGE_INSTABILITY",
            "ATS_TRANSFER_FAILURE",
            "MDP_SUPPLY_LOSS",
            "MDP_PHASE_IMBALANCE",
            "SDP_BREAKER_TRIP",
            "SDP_SUPPLY_LOSS",
            "UPS_INPUT_POWER_LOSS",
            "UPS_BATTERY_DEGRADATION",
            "UPS_OVERLOAD",
            "FIRE_ALARM",
            "INTRUDER_ALARM");

    @Autowired
    private DiagnosisService diagnosisService;

    @Test
    void coversEveryAlarmCodeRaisedByAlarmService() {
        assertThat(diagnosisService.supportedAlarmCodes())
                .containsExactlyInAnyOrderElementsOf(ALARM_CODES_RAISED_BY_ALARM_SERVICE);
    }

    @Test
    void coversEveryPredictedFailureTypeFromFaultCodeMap() {
        assertThat(diagnosisService.supportedFailureTypes())
                .containsExactlyInAnyOrderElementsOf(PREDICTED_FAILURE_TYPES);
    }

    @Test
    void everyDiagnosisHasProbableCausesAndOrderedActions() {
        assertThat(diagnosisService.findAll()).allSatisfy(diagnosis -> {
            assertThat(diagnosis.probableCauses()).isNotEmpty();
            assertThat(diagnosis.correctiveActions()).isNotEmpty();
            assertThat(diagnosis.correctiveActions())
                    .extracting("step")
                    .containsExactly(expectedSteps(diagnosis));
        });
    }

    @Test
    void resolvesDatasetFailureTypeToAlarmDiagnosis() {
        DiagnosisResponse diagnosis = diagnosisService.requireByKey("GEN_OVERHEAT");

        assertThat(diagnosis.key()).isEqualTo("GEN_OVERHEAT");
        assertThat(diagnosis.sourceFailureType()).isEqualTo("GEN_OVERHEAT");
    }

    private Integer[] expectedSteps(DiagnosisResponse diagnosis) {
        return java.util.stream.IntStream.rangeClosed(1, diagnosis.correctiveActions().size())
                .boxed()
                .toArray(Integer[]::new);
    }
}
