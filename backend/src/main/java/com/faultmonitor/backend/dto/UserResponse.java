package com.faultmonitor.backend.dto;

/** Response for GET /api/auth/me (sprint plan §5). */
public record UserResponse(Long id, String username, String role) {
}
