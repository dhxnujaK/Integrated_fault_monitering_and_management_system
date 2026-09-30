package com.faultmonitor.backend.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.faultmonitor.backend.repository.UserRepository;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@ActiveProfiles("dev")
@SpringBootTest(properties = "simulation.enabled=false")
@AutoConfigureMockMvc
@Transactional
class UserControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCanCreateOperatorAndManageIt() throws Exception {
        long id = createUser("operator1", "OPERATOR");

        mockMvc.perform(get("/api/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.username == 'operator1')].role").value("OPERATOR"));

        mockMvc.perform(patch("/api/users/{userId}/enabled", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("enabled", false))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(false));

        mockMvc.perform(patch("/api/users/{userId}/role", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));

        mockMvc.perform(put("/api/users/{userId}/password", id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("newPassword", "reset-pass-99"))))
                .andExpect(status().isNoContent());
        String hash = userRepository.findById(id).orElseThrow().getPasswordHash();
        assertThat(passwordEncoder.matches("reset-pass-99", hash)).isTrue();
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void duplicateUsernameIsRejected() throws Exception {
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "admin", "password", "password123", "role", "OPERATOR"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("USERNAME_TAKEN"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCannotDisableOrDemoteSelf() throws Exception {
        long adminId = userRepository.findByUsername("admin").orElseThrow().getId();

        mockMvc.perform(patch("/api/users/{userId}/enabled", adminId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("enabled", false))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_DISABLE_SELF"));

        mockMvc.perform(patch("/api/users/{userId}/role", adminId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("role", "OPERATOR"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CANNOT_DEMOTE_SELF"));
    }

    @Test
    @WithMockUser(username = "operator", roles = "OPERATOR")
    void operatorIsDeniedUserManagement() throws Exception {
        mockMvc.perform(get("/api/users"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("username", "sneaky", "password", "password123", "role", "ADMIN"))))
                .andExpect(status().isForbidden());
    }

    private long createUser(String username, String role) throws Exception {
        String body = mockMvc.perform(post("/api/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of(
                                "username", username,
                                "password", "password123",
                                "role", role,
                                "fullName", "Shift Operator"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullName").value("Shift Operator"))
                .andReturn().getResponse().getContentAsString();
        JsonNode node = objectMapper.readTree(body);
        return node.get("id").asLong();
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }
}
