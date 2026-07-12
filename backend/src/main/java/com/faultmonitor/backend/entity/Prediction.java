package com.faultmonitor.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
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
        name = "predictions",
        indexes = {
                @Index(name = "idx_subsystem_time", columnList = "subsystem_type, predicted_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "subsystem_type", nullable = false)
    private SubsystemType subsystemType;

    @Column(name = "subsystem_id", nullable = false, length = 50)
    private String subsystemId;

    @Column(name = "failure_probability", nullable = false)
    private Double failureProbability;

    @Column(name = "predicted_failure_type", length = 200)
    private String predictedFailureType;

    @Column(name = "recommended_actions", columnDefinition = "TEXT")
    private String recommendedActions;

    private Double confidence;

    @CreationTimestamp
    @Column(name = "predicted_at", nullable = false, updatable = false)
    private LocalDateTime predictedAt;
}
