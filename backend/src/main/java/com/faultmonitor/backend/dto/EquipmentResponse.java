package com.faultmonitor.backend.dto;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SubsystemType;

public record EquipmentResponse(
        Long id,
        String equipmentCode,
        SubsystemType equipmentType,
        String displayName,
        String location,
        String description,
        boolean enabled
) {
    public static EquipmentResponse from(Equipment equipment) {
        return new EquipmentResponse(
                equipment.getId(),
                equipment.getEquipmentCode(),
                equipment.getEquipmentType(),
                equipment.getDisplayName(),
                equipment.getLocation(),
                equipment.getDescription(),
                equipment.isEnabled());
    }
}
