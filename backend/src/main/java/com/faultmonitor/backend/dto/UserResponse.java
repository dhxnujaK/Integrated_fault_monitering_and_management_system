package com.faultmonitor.backend.dto;

/** Response for GET /api/auth/me (sprint plan §5). */
public record UserResponse(Long id, String username, String role, Boolean enabled) {
    public UserResponse(Long id, String username, String role) {
        this(id, username, role, true);
    }
}
