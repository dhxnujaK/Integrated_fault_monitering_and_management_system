package com.faultmonitor.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
        name = "alarms",
        indexes = {
                @Index(name = "idx_status", columnList = "status"),
                @Index(name = "idx_subsystem", columnList = "subsystem_type, status")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "subsystem_type", nullable = false)
    private SubsystemType subsystemType;

    @Column(name = "subsystem_id", nullable = false, length = 50)
    private String subsystemId;

    /** See SensorReading.equipment for the additive relationship migration. */
    @ManyToOne
    @JoinColumn(name = "equipment_id")
    private Equipment equipment;

    @Column(name = "alarm_code", nullable = false, length = 100)
    private String alarmCode;

    @Column(name = "alarm_message", nullable = false, length = 500)
    private String alarmMessage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlarmSeverity severity;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlarmStatus status = AlarmStatus.ACTIVE;

    @CreationTimestamp
    @Column(name = "triggered_at", nullable = false, updatable = false)
    private LocalDateTime triggeredAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "acknowledged_by")
    private Long acknowledgedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
