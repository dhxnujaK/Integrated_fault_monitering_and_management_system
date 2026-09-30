package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.CreateUserRequest;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.UserResponse;
import com.faultmonitor.backend.entity.Role;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Admin-only user management. Admins cannot disable or demote their own account,
 * so the system always keeps at least the acting admin.
 */
@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(int page, int size) {
        return PageResponse.from(userRepository
                .findAll(PageRequest.of(page, size, Sort.by("username").ascending()))
                .map(UserResponse::from));
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String username = request.username().trim();
        if (userRepository.existsByUsername(username)) {
            throw new ApiException(HttpStatus.CONFLICT, "USERNAME_TAKEN", "Username is already in use.");
        }
        User user = User.builder()
                .username(username)
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(request.role())
                .fullName(blankToNull(request.fullName()))
                .email(blankToNull(request.email()))
                .build();
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse setEnabled(Long userId, boolean enabled, String actingUsername) {
        User user = requireUser(userId);
        if (!enabled && user.getUsername().equals(actingUsername)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_DISABLE_SELF",
                    "You cannot disable your own account.");
        }
        user.setEnabled(enabled);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse setRole(Long userId, Role role, String actingUsername) {
        User user = requireUser(userId);
        if (role != Role.ADMIN && user.getUsername().equals(actingUsername)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CANNOT_DEMOTE_SELF",
                    "You cannot remove your own admin role.");
        }
        user.setRole(role);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(Long userId, String newPassword) {
        User user = requireUser(userId);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
