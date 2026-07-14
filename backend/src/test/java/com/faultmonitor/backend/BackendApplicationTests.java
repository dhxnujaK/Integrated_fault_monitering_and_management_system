package com.faultmonitor.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
class BackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
