package com.faultmonitor.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Persisted threshold override for a single metric on a specific piece of equipment.
 *
 * <p>When a row exists for (equipment, metricKey) the stored {@code value} overrides
 * the hard-coded system default.  If no row exists the hard-coded default applies —
 * so this table starts empty and fills only as admins adjust limits.
 *
 * <p>metricKey is a free-form string that mirrors the constant names used by
 * {@code AlarmService} (e.g. "GENERATOR_LOW_FUEL", "UPS_LOW_BATTERY"). The application
 * defines the accepted keys per equipment type; the service rejects unknown keys.
 */
@Entity
@Table(
        name = "equipment_thresholds",
        uniqueConstraints = @UniqueConstraint(columnNames = {"equipment_id", "metric_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipmentThreshold {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    /** Logical identifier for the threshold (e.g. "GENERATOR_LOW_FUEL"). */
    @Column(name = "metric_key", nullable = false, length = 100)
    private String metricKey;

    /** The threshold value to use instead of the system default. */
    @Column(name = "threshold_value", nullable = false)
    private double thresholdValue;

    /** Minimum allowed value for this metric (enforced on save). */
    @Column(name = "min_value")
    private Double minValue;

    /** Maximum allowed value for this metric (enforced on save). */
    @Column(name = "max_value")
    private Double maxValue;

    public double getValue() {
        return thresholdValue;
    }

    public void setValue(double value) {
        this.thresholdValue = value;
    }

    /** Human-readable label for the metric, e.g. "Low fuel threshold (%)". */
    @Column(length = 200)
    private String label;

    /** Units string for display, e.g. "%", "°C", "V". */
    @Column(length = 20)
    private String unit;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
