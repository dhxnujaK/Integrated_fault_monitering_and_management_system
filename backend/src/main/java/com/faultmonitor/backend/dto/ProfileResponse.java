package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.User;
import java.time.LocalDateTime;

/** Response for GET/PUT /api/profile. */
public record ProfileResponse(
        Long id,
        String username,
        String role,
        String fullName,
        String email,
        String phone,
        LocalDateTime createdAt
) {
    public static ProfileResponse from(User user) {
        return new ProfileResponse(
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getCreatedAt());
    }
}
