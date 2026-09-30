package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.dto.CreateTicketRequest;
import com.faultmonitor.backend.dto.PageResponse;
import com.faultmonitor.backend.dto.TicketResponse;
import com.faultmonitor.backend.dto.UpdateTicketRequest;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.entity.TicketStatus;
import com.faultmonitor.backend.service.TicketService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<TicketResponse> create(
            @Valid @RequestBody CreateTicketRequest request,
            Authentication authentication) {
        TicketResponse created = ticketService.createTicket(request, authentication.getName());
        return ResponseEntity.created(URI.create("/api/tickets/" + created.id())).body(created);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public PageResponse<TicketResponse> findAll(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) SubsystemType equipmentType,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ticketService.findAll(status, equipmentType, equipmentId, page, size);
    }

    @GetMapping("/{ticketId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public TicketResponse findById(@PathVariable Long ticketId) {
        return ticketService.getTicketById(ticketId);
    }

    @PutMapping("/{ticketId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public TicketResponse update(
            @PathVariable Long ticketId,
            @Valid @RequestBody UpdateTicketRequest request) {
        return ticketService.updateTicket(ticketId, request);
    }
}
