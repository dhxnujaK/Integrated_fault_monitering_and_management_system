package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.SensorReading;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SensorReadingRepository extends JpaRepository<SensorReading, Long> {

    Optional<SensorReading> findFirstBySubsystemTypeAndSubsystemIdOrderByRecordedAtDesc(
            SubsystemType subsystemType, String subsystemId);

    List<SensorReading> findBySubsystemTypeAndSubsystemIdOrderByRecordedAtDesc(
            SubsystemType subsystemType, String subsystemId);

    List<SensorReading> findByEquipmentIsNull();

    Optional<SensorReading> findFirstByEquipmentIdOrderByRecordedAtDesc(Long equipmentId);

    List<SensorReading> findByEquipmentIdOrderByRecordedAtDesc(Long equipmentId, Pageable pageable);
}
