package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.ChangePasswordRequest;
import com.faultmonitor.backend.dto.ProfileResponse;
import com.faultmonitor.backend.dto.UpdateProfileRequest;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Self-service profile operations for the signed-in user. */
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public ProfileResponse get(String username) {
        return ProfileResponse.from(requireUser(username));
    }

    @Transactional
    public ProfileResponse update(String username, UpdateProfileRequest request) {
        User user = requireUser(username);
        user.setFullName(blankToNull(request.fullName()));
        user.setEmail(blankToNull(request.email()));
        user.setPhone(blankToNull(request.phone()));
        return ProfileResponse.from(userRepository.save(user));
    }

    /**
     * Wrong current password is reported as 400, not 401: the frontend treats 401
     * as an expired session and signs the user out.
     */
    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = requireUser(username);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_CURRENT_PASSWORD",
                    "Current password is incorrect.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PASSWORD_UNCHANGED",
                    "New password must be different from the current password.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private User requireUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found."));
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
