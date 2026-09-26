package com.faultmonitor.backend.service;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.AlarmRepository;
import com.faultmonitor.backend.repository.MaintenanceTicketRepository;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generates in-memory CSV reports for alarms and maintenance tickets.
 *
 * <p>PDF format is pre-cut (Tier C). Any call with format=PDF must be rejected
 * with 501 by the controller; this service does not implement it.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final AlarmRepository alarmRepository;
    private final MaintenanceTicketRepository ticketRepository;

    // ------------------------------------------------------------------ alarms

    /**
     * Returns a UTF-8 CSV of all alarms matching the given filters and date range.
     *
     * @param equipmentId   optional equipment ID filter
     * @param subsystemType optional equipment type filter
     * @param from          inclusive start of the triggeredAt window
     * @param to            inclusive end   of the triggeredAt window
     * @return raw CSV bytes (UTF-8)
     */
    @Transactional(readOnly = true)
    public byte[] generateAlarmCsv(
            Long equipmentId,
            SubsystemType subsystemType,
            LocalDateTime from,
            LocalDateTime to) {

        List<Alarm> alarms = alarmRepository.findForReport(equipmentId, subsystemType, from, to);
        return buildAlarmCsv(alarms);
    }

    private byte[] buildAlarmCsv(List<Alarm> alarms) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);

        // Header
        pw.println("id,alarmCode,alarmMessage,severity,status,"
                + "subsystemType,subsystemId,equipmentId,equipmentCode,"
                + "triggeredAt,acknowledgedAt,resolvedAt,acknowledgedBy,acknowledgementNote");

        for (Alarm a : alarms) {
            pw.printf(
                    "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                    csv(a.getId()),
                    csv(a.getAlarmCode()),
                    csv(a.getAlarmMessage()),
                    csv(a.getSeverity()),
                    csv(a.getStatus()),
                    csv(a.getSubsystemType()),
                    csv(a.getSubsystemId()),
                    a.getEquipment() != null ? csv(a.getEquipment().getId()) : "",
                    a.getEquipment() != null ? csv(a.getEquipment().getEquipmentCode()) : "",
                    csv(a.getTriggeredAt()),
                    csv(a.getAcknowledgedAt()),
                    csv(a.getResolvedAt()),
                    a.getAcknowledgedBy() != null ? csv(a.getAcknowledgedBy().getUsername()) : "",
                    csv(a.getAcknowledgementNote()));
        }

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ------------------------------------------------------------------ tickets

    /**
     * Returns a UTF-8 CSV of all maintenance tickets matching the given filters
     * and date range.
     *
     * @param equipmentId   optional equipment ID filter
     * @param subsystemType optional equipment type filter
     * @param from          inclusive start of the createdAt window
     * @param to            inclusive end   of the createdAt window
     * @return raw CSV bytes (UTF-8)
     */
    @Transactional(readOnly = true)
    public byte[] generateTicketCsv(
            Long equipmentId,
            SubsystemType subsystemType,
            LocalDateTime from,
            LocalDateTime to) {

        List<MaintenanceTicket> tickets =
                ticketRepository.findForReport(equipmentId, subsystemType, from, to);
        return buildTicketCsv(tickets);
    }

    private byte[] buildTicketCsv(List<MaintenanceTicket> tickets) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);

        // Header
        pw.println("id,title,description,status,priority,"
                + "subsystemType,subsystemId,equipmentId,equipmentCode,"
                + "alarmId,predictionId,createdBy,createdAt,updatedAt");

        for (MaintenanceTicket t : tickets) {
            pw.printf(
                    "%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s%n",
                    csv(t.getId()),
                    csv(t.getTitle()),
                    csv(t.getDescription()),
                    csv(t.getStatus()),
                    csv(t.getPriority()),
                    csv(t.getSubsystemType()),
                    csv(t.getSubsystemId()),
                    t.getEquipment() != null ? csv(t.getEquipment().getId()) : "",
                    t.getEquipment() != null ? csv(t.getEquipment().getEquipmentCode()) : "",
                    csv(t.getAlarmId()),
                    csv(t.getPredictionId()),
                    csv(t.getCreatedBy()),
                    csv(t.getCreatedAt()),
                    csv(t.getUpdatedAt()));
        }

        return sw.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // ----------------------------------------------------------------- helpers

    /** Escapes a value for RFC-4180 CSV. Wraps in quotes if it contains commas,
     *  quotes or newlines. Returns empty string for null. */
    private String csv(Object value) {
        if (value == null) {
            return "";
        }
        String s = value instanceof LocalDateTime ldt ? ldt.format(FMT) : value.toString();
        // Must quote if the field contains comma, double-quote, or line terminator
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
