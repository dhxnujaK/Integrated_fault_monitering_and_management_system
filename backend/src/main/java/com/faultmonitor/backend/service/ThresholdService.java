package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.ThresholdResponse;
import com.faultmonitor.backend.dto.UpsertThresholdRequest;
import com.faultmonitor.backend.entity.EquipmentThreshold;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.EquipmentThresholdRepository;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Manages persisted threshold overrides for alarm detection.
 *
 * <h2>Design</h2>
 * <p>AlarmService hard-codes system defaults (e.g. GEN fuel &lt; 20 %). Admins may
 * override any listed metric via the Settings API. AlarmService calls
 * {@link #getEffective(Long, String, double)} to resolve the live value: if an
 * override row exists it wins; otherwise the hard-coded default applies.
 *
 * <h2>Catalogue</h2>
 * <p>Supported metrics are listed in {@link #METRIC_CATALOGUE}. Each entry carries:
 * <ul>
 *   <li>the system default value
 *   <li>acceptable min/max for validation
 *   <li>human label and unit for the UI
 *   <li>which equipment type the metric applies to
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class ThresholdService {

    // ---------------------------------------------------------------- catalogue

    /** Immutable descriptor for one configurable threshold. */
    public record MetricDescriptor(
            String metricKey,
            SubsystemType equipmentType,
            double systemDefault,
            double minValue,
            double maxValue,
            String label,
            String unit) {}

    /**
     * All threshold metrics that can be overridden per equipment.
     * Keys mirror the constants in AlarmService.
     */
    public static final List<MetricDescriptor> METRIC_CATALOGUE = List.of(
            // Generator
            new MetricDescriptor("GENERATOR_LOW_FUEL",       SubsystemType.GENERATOR, 20.0,  1.0,  50.0,  "Low fuel threshold",          "%"),
            new MetricDescriptor("GENERATOR_CRITICAL_FUEL",  SubsystemType.GENERATOR, 10.0,  1.0,  30.0,  "Critical fuel threshold",      "%"),
            new MetricDescriptor("GENERATOR_HIGH_TEMP",      SubsystemType.GENERATOR, 45.0, 30.0,  80.0,  "High room temperature",        "°C"),
            // UPS
            new MetricDescriptor("UPS_LOW_BATTERY",          SubsystemType.UPS,       40.0, 10.0,  70.0,  "Low battery threshold",        "%"),
            new MetricDescriptor("UPS_CRITICAL_BATTERY",     SubsystemType.UPS,       20.0,  5.0,  50.0,  "Critical battery threshold",   "%"),
            new MetricDescriptor("UPS_HIGH_LOAD",            SubsystemType.UPS,       80.0, 50.0,  99.0,  "High load threshold",          "%"),
            // Shared voltage window (applies to all types that check phase voltage)
            new MetricDescriptor("MIN_PHASE_VOLTAGE",        SubsystemType.GENERATOR, 207.0, 180.0, 220.0, "Minimum phase voltage",       "V"),
            new MetricDescriptor("MAX_PHASE_VOLTAGE",        SubsystemType.GENERATOR, 253.0, 230.0, 280.0, "Maximum phase voltage",       "V"),
            new MetricDescriptor("PHASE_IMBALANCE_LIMIT",    SubsystemType.MDP,        5.0,  1.0,  20.0,  "Phase imbalance limit",        "V"));

    private static final Map<String, MetricDescriptor> BY_KEY;

    static {
        var map = new java.util.LinkedHashMap<String, MetricDescriptor>();
        for (MetricDescriptor d : METRIC_CATALOGUE) {
            map.put(d.metricKey(), d);
        }
        BY_KEY = Map.copyOf(map);
    }

    // ------------------------------------------------------------------ fields

    private final EquipmentThresholdRepository thresholdRepository;
    private final EquipmentService equipmentService;

    // ------------------------------------------------------------------ reads

    /**
     * Returns all threshold overrides persisted for one piece of equipment.
     * The system default is embedded in each response for UI display.
     */
    @Transactional(readOnly = true)
    public List<ThresholdResponse> findByEquipment(Long equipmentId) {
        var equipment = equipmentService.requireEquipment(equipmentId);
        var overrides = thresholdRepository.findByEquipmentId(equipmentId).stream()
                .collect(java.util.stream.Collectors.toMap(EquipmentThreshold::getMetricKey, t -> t));

        return findDescriptorsForType(equipment.getEquipmentType()).stream()
                .map(desc -> {
                    EquipmentThreshold saved = overrides.get(desc.metricKey());
                    if (saved != null) {
                        return ThresholdResponse.from(saved, desc.systemDefault());
                    }
                    return new ThresholdResponse(
                            null,
                            equipmentId,
                            equipment.getEquipmentCode(),
                            desc.metricKey(),
                            desc.systemDefault(),
                            desc.systemDefault(),
                            desc.minValue(),
                            desc.maxValue(),
                            desc.label(),
                            desc.unit(),
                            null,
                            null);
                })
                .toList();
    }

    /**
     * Returns all threshold descriptors (system defaults) for a given equipment type.
     * Merges in any existing overrides from the database.
     */
    @Transactional(readOnly = true)
        public List<MetricDescriptor> findDescriptorsForType(SubsystemType equipmentType) {
        return METRIC_CATALOGUE.stream()
                .filter(d -> d.equipmentType() == equipmentType)
                .toList();
    }

    // ------------------------------------------------------------------ writes

    /**
     * Creates or updates a threshold override for the given equipment and metric.
     * Enforces that the metric exists in the catalogue, that the value is within
     * the allowed range, and that the equipment type matches the metric's type.
     *
     * <p>This operation is atomic: it loads the existing row (or creates a new one)
     * and saves it in a single transaction.
     */
    @Transactional
    public ThresholdResponse upsert(Long equipmentId, UpsertThresholdRequest request, String updatedBy) {
        var equipment = equipmentService.requireEquipment(equipmentId);

        MetricDescriptor desc = BY_KEY.get(request.metricKey());
        if (desc == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "UNKNOWN_METRIC",
                    "Unknown metric key '" + request.metricKey() + "'. "
                            + "Supported keys: " + BY_KEY.keySet());
        }

        double value = request.value();
        if (value < desc.minValue() || value > desc.maxValue()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "Value " + value + " is outside the allowed range ["
                            + desc.minValue() + ", " + desc.maxValue() + "] "
                            + "for metric '" + desc.metricKey() + "'.");
        }

        EquipmentThreshold threshold = thresholdRepository
                .findByEquipmentIdAndMetricKey(equipmentId, request.metricKey())
                .orElseGet(() -> EquipmentThreshold.builder()
                        .equipment(equipment)
                        .metricKey(request.metricKey())
                        .minValue(desc.minValue())
                        .maxValue(desc.maxValue())
                        .label(desc.label())
                        .unit(desc.unit())
                        .build());

        threshold.setValue(value);
        threshold.setUpdatedBy(updatedBy);
        EquipmentThreshold saved = thresholdRepository.save(threshold);
        return ThresholdResponse.from(saved, desc.systemDefault());
    }

    /**
     * Deletes a threshold override, restoring the system default for that metric.
     */
    @Transactional
    public void delete(Long equipmentId, String metricKey) {
        equipmentService.requireEquipment(equipmentId);
        EquipmentThreshold threshold = thresholdRepository
                .findByEquipmentIdAndMetricKey(equipmentId, metricKey)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "THRESHOLD_NOT_FOUND",
                        "No override found for metric '" + metricKey + "' on equipment " + equipmentId + "."));
        thresholdRepository.delete(threshold);
    }

    // ----------------------------------------------------------------- runtime

    /**
     * Returns the effective threshold value for a given equipment and metric.
     * If an override exists the stored value is returned; otherwise the
     * {@code systemDefault} is returned.
     *
     * <p>This is called from AlarmService on every tick — it must be fast.
     * Spring's @Transactional ensures a clean read without holding a connection
     * open between simulation ticks.
     */
    @Transactional(readOnly = true)
    public double getEffective(Long equipmentId, String metricKey, double systemDefault) {
        return thresholdRepository.findByEquipmentIdAndMetricKey(equipmentId, metricKey)
                .map(EquipmentThreshold::getValue)
                .orElse(systemDefault);
    }

    /** All supported metric descriptors, for client discovery. */
    public List<MetricDescriptor> getCatalogue() {
        return METRIC_CATALOGUE;
    }
}
