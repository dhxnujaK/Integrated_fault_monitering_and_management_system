package com.faultmonitor.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.bootstrap.EquipmentBackfillRunner;
import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmSeverity;
import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.EquipmentRepository;
import com.faultmonitor.backend.repository.SensorReadingRepository;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@Transactional
class BackendApplicationTests {

	@Autowired
	private EquipmentRepository equipmentRepository;

	@Autowired
	private SensorReadingRepository sensorReadingRepository;

	@Autowired
	private AlarmRepository alarmRepository;

	@Autowired
	private EquipmentBackfillRunner equipmentBackfillRunner;

	@Test
	void contextLoads() {
	}

	@Test
	void seedsEquipmentWithLegacySubsystemCodes() {
		Set<String> codes = equipmentRepository.findAll().stream()
				.map(item -> item.getEquipmentCode())
				.collect(java.util.stream.Collectors.toSet());

		assertThat(codes).containsExactlyInAnyOrder(
				"GENERATOR-01", "ATS-01", "MDP-01", "SDP-01", "SDP-02", "UPS-01", "UPS-02");
	}

	@Test
	void backfillsLegacyOperationalRowsByExactSubsystemCodeAndType() throws Exception {
		SensorReading reading = sensorReadingRepository.save(SensorReading.builder()
				.subsystemType(SubsystemType.GENERATOR)
				.subsystemId("GENERATOR-01")
				.readingData("{}")
				.build());
		Alarm alarm = alarmRepository.save(Alarm.builder()
				.subsystemType(SubsystemType.GENERATOR)
				.subsystemId("GENERATOR-01")
				.alarmCode("GEN_LOW_FUEL")
				.alarmMessage("Low fuel")
				.severity(AlarmSeverity.WARNING)
				.build());

		equipmentBackfillRunner.run();

		assertThat(sensorReadingRepository.findById(reading.getId()).orElseThrow().getEquipment().getEquipmentCode())
				.isEqualTo("GENERATOR-01");
		assertThat(alarmRepository.findById(alarm.getId()).orElseThrow().getEquipment().getEquipmentCode())
				.isEqualTo("GENERATOR-01");
	}

}
