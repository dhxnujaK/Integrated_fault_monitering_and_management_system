package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    Optional<Equipment> findByEquipmentCode(String equipmentCode);

    List<Equipment> findByEnabledTrueAndEquipmentType(SubsystemType equipmentType);
}
