package com.faultmonitor.backend;

import static org.assertj.core.api.Assertions.assertThat;

import com.faultmonitor.backend.repository.EquipmentRepository;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
class BackendApplicationTests {

	@Autowired
	private EquipmentRepository equipmentRepository;

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

}
