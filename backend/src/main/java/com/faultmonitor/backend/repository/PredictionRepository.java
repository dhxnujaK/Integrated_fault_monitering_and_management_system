package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.Prediction;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PredictionRepository extends JpaRepository<Prediction, Long> {

    Optional<Prediction> findFirstBySubsystemTypeAndSubsystemIdOrderByPredictedAtDesc(
            SubsystemType subsystemType, String subsystemId);

    Optional<Prediction> findFirstByEquipmentIdOrderByPredictedAtDesc(Long equipmentId);

    Page<Prediction> findByEquipmentIdOrderByPredictedAtDesc(Long equipmentId, Pageable pageable);

    List<Prediction> findByEquipmentIsNull();
}
