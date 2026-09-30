package com.faultmonitor.backend.controller;

import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.service.ReportService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Provides downloadable reports for alarms and maintenance tickets.
 *
 * <p>Supported formats: CSV only. PDF is Tier C (pre-cut); the endpoint accepts the
 * parameter and returns 501 Not Implemented with an explicit message — it must never
 * silently return CSV instead.
 *
 * <p>Roles: ADMIN and OPERATOR may download reports (sprint_plan 3.md §6, §8).
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET /api/reports/alarms  — alarm report
 *   <li>GET /api/reports/tickets — ticket report
 * </ul>
 *
 * <p>Common query parameters:
 * <ul>
 *   <li>format     (required) CSV | PDF
 *   <li>from       (required) ISO local date-time, e.g. 2025-01-01T00:00:00
 *   <li>to         (required) ISO local date-time, e.g. 2025-06-30T23:59:59
 *   <li>equipmentId   (optional) filter by equipment ID
 *   <li>equipmentType (optional) filter by equipment type (SubsystemType enum value)
 * </ul>
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final String FORMAT_CSV = "CSV";
    private static final String FORMAT_PDF = "PDF";
    private static final String PDF_NOT_IMPLEMENTED =
            "PDF reports are not yet implemented. Please use format=CSV.";

    private final ReportService reportService;

    // ------------------------------------------------------------------ alarms

    @GetMapping("/alarms")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<byte[]> alarmsReport(
            @RequestParam String format,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) SubsystemType equipmentType) {

        validateDateRange(from, to);
        validateFormat(format);

        byte[] csv = reportService.generateAlarmCsv(equipmentId, equipmentType, from, to);
        return csvResponse(csv, "alarms-report.csv");
    }

    // ------------------------------------------------------------------ tickets

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public ResponseEntity<byte[]> ticketsReport(
            @RequestParam String format,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) SubsystemType equipmentType) {

        validateDateRange(from, to);
        validateFormat(format);

        byte[] csv = reportService.generateTicketCsv(equipmentId, equipmentType, from, to);
        return csvResponse(csv, "tickets-report.csv");
    }

    // ----------------------------------------------------------------- helpers

    /** Builds a download response with Content-Disposition: attachment. */
    private ResponseEntity<byte[]> csvResponse(byte[] body, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv;charset=UTF-8"));
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(body.length);
        return ResponseEntity.ok().headers(headers).body(body);
    }

    /**
     * Validates the format parameter.
     * PDF is accepted (the parameter must not be silently ignored) but returns 501.
     */
    private void validateFormat(String format) {
        if (format == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Query parameter 'format' is required.");
        }
        String upper = format.toUpperCase();
        if (FORMAT_PDF.equals(upper)) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, PDF_NOT_IMPLEMENTED);
        }
        if (!FORMAT_CSV.equals(upper)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported format '" + format + "'. Supported: CSV.");
        }
    }

    /** Ensures from is before or equal to to. */
    private void validateDateRange(LocalDateTime from, LocalDateTime to) {
        if (from.isAfter(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "'from' must be before or equal to 'to'.");
        }
    }
}
