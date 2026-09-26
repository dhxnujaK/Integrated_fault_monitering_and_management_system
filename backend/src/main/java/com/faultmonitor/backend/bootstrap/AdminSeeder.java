package com.faultmonitor.backend.bootstrap;

import com.faultmonitor.backend.entity.Role;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds the default admin user on startup (sprint plan §7, Sprint 1).
 * Runs after Hibernate creates the schema, and BCrypt-hashes the password at
 * runtime — which is why this is a CommandLineRunner rather than data.sql.
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "admin123";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.existsByUsername(ADMIN_USERNAME)) {
            return;
        }
        User admin = User.builder()
                .username(ADMIN_USERNAME)
                .passwordHash(passwordEncoder.encode(ADMIN_PASSWORD))
                .role(Role.ADMIN)
                .build();
        userRepository.save(admin);
        log.info("Seeded default admin user '{}'", ADMIN_USERNAME);
    }
}
