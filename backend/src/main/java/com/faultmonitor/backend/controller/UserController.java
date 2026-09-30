package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.UserResponse;
import com.faultmonitor.backend.entity.User;
import com.faultmonitor.backend.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<UserResponse> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
        Page<User> users = userRepository.findAll(pageable);
        return new PageResponse<>(
                users.getContent().stream()
                        .map(u -> new UserResponse(u.getId(), u.getUsername(), u.getRole().name(), u.getEnabled()))
                        .toList(),
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages());
    }

    @PatchMapping("/users/{userId}/enabled")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse setEnabled(@PathVariable Long userId, @Valid @RequestBody UserEnabledRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        user.setEnabled(request.enabled());
        User saved = userRepository.save(user);
        return new UserResponse(saved.getId(), saved.getUsername(), saved.getRole().name(), saved.getEnabled());
    }

    public record UserEnabledRequest(@NotNull Boolean enabled) {
    }
}
