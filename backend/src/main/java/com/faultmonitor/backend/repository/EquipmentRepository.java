package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    Optional<Equipment> findByEquipmentCode(String equipmentCode);

    boolean existsByEquipmentCodeIgnoreCase(String equipmentCode);

    List<Equipment> findAllByOrderByEquipmentCodeAsc();

    List<Equipment> findByEquipmentTypeOrderByEquipmentCodeAsc(SubsystemType equipmentType);

    List<Equipment> findByEnabledOrderByEquipmentCodeAsc(boolean enabled);

    List<Equipment> findByEquipmentTypeAndEnabledOrderByEquipmentCodeAsc(
            SubsystemType equipmentType, boolean enabled);

    List<Equipment> findByEnabledTrueOrderByEquipmentCodeAsc();

    List<Equipment> findByEnabledTrueAndEquipmentType(SubsystemType equipmentType);
}
