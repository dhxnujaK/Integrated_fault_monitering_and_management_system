package com.faultmonitor.backend.dto;

/** Response for POST /api/auth/login (sprint plan §5). */
public record LoginResponse(String token, String username, String role) {
}
