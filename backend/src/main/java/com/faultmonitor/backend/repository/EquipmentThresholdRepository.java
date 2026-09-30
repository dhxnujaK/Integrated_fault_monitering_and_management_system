package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.EquipmentThreshold;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentThresholdRepository extends JpaRepository<EquipmentThreshold, Long> {

    /** All thresholds for one piece of equipment. */
    List<EquipmentThreshold> findByEquipmentId(Long equipmentId);

    /** Specific threshold for a piece of equipment and a metric key. */
    Optional<EquipmentThreshold> findByEquipmentIdAndMetricKey(Long equipmentId, String metricKey);

    /** All thresholds for one equipment type (useful for bulk display). */
    List<EquipmentThreshold> findByEquipmentEquipmentType(
            com.faultmonitor.backend.entity.SubsystemType equipmentType);
}
