package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.ChangePasswordRequest;
import com.faultmonitor.backend.dto.ProfileResponse;
import com.faultmonitor.backend.dto.UpdateProfileRequest;
import com.faultmonitor.backend.service.ProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ProfileResponse get(Authentication authentication) {
        return profileService.get(authentication.getName());
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ProfileResponse update(Authentication authentication, @Valid @RequestBody UpdateProfileRequest request) {
        return profileService.update(authentication.getName(), request);
    }

    @PutMapping("/password")
    @PreAuthorize("hasAnyRole('ADMIN','OPERATOR')")
    public ResponseEntity<Void> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        profileService.changePassword(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
