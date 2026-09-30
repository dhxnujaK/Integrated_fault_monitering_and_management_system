package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.CreateUserRequest;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.ResetPasswordRequest;
import com.faultmonitor.backend.dto.UserResponse;
import com.faultmonitor.backend.entity.Role;
import com.faultmonitor.backend.service.UserAdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserAdminService userAdminService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<UserResponse> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userAdminService.list(page, size);
    }

    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return userAdminService.create(request);
    }

    @PatchMapping("/users/{userId}/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse setEnabled(
            @PathVariable Long userId,
            @Valid @RequestBody UserEnabledRequest request,
            Authentication authentication) {
        return userAdminService.setEnabled(userId, request.enabled(), authentication.getName());
    }

    @PatchMapping("/users/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse setRole(
            @PathVariable Long userId,
            @Valid @RequestBody UserRoleRequest request,
            Authentication authentication) {
        return userAdminService.setRole(userId, request.role(), authentication.getName());
    }

    @PutMapping("/users/{userId}/password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> resetPassword(
            @PathVariable Long userId,
            @Valid @RequestBody ResetPasswordRequest request) {
        userAdminService.resetPassword(userId, request.newPassword());
        return ResponseEntity.noContent().build();
    }

    public record UserEnabledRequest(@NotNull Boolean enabled) {
    }

    public record UserRoleRequest(@NotNull Role role) {
    }
}
