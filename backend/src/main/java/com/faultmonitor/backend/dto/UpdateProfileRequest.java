package com.faultmonitor.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 150, message = "fullName must not exceed 150 characters")
        String fullName,
        @Email(message = "email must be a valid email address")
        @Size(max = 150, message = "email must not exceed 150 characters")
        String email,
        @Pattern(regexp = "^$|^[+0-9 ()-]{7,30}$", message = "phone must contain 7-30 digits, spaces, +, - or brackets")
        String phone
) {
}
