package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.User;

/** Response for GET /api/auth/me and the user administration endpoints (sprint plan §5). */
public record UserResponse(Long id, String username, String role, Boolean enabled, String fullName) {
    public UserResponse(Long id, String username, String role) {
        this(id, username, role, true, null);
    }

    public static UserResponse from(User user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getRole().name(), user.getEnabled(),
                user.getFullName());
    }
}
