package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "username is required")
        @Pattern(regexp = "^[A-Za-z0-9._-]{3,50}$",
                message = "username must be 3-50 letters, digits, dots, dashes or underscores")
        String username,
        @NotBlank(message = "password is required")
        @Size(min = 8, max = 100, message = "password must be 8-100 characters")
        String password,
        @NotNull(message = "role is required")
        Role role,
        @Size(max = 150, message = "fullName must not exceed 150 characters")
        String fullName,
        @Email(message = "email must be a valid email address")
        @Size(max = 150, message = "email must not exceed 150 characters")
        String email
) {
}
