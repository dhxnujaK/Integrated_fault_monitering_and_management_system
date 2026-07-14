package com.faultmonitor.backend.service;

import com.faultmonitor.backend.dto.CreateEquipmentRequest;
import com.faultmonitor.backend.dto.EquipmentEnabledRequest;
import com.faultmonitor.backend.dto.EquipmentResponse;
import com.faultmonitor.backend.dto.UpdateEquipmentRequest;
import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.exception.ApiException;
import com.faultmonitor.backend.repository.EquipmentRepository;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;

    @Transactional(readOnly = true)
    public List<EquipmentResponse> findAll(SubsystemType type, Boolean enabled) {
        List<Equipment> equipment;
        if (type != null && enabled != null) {
            equipment = equipmentRepository.findByEquipmentTypeAndEnabledOrderByEquipmentCodeAsc(type, enabled);
        } else if (type != null) {
            equipment = equipmentRepository.findByEquipmentTypeOrderByEquipmentCodeAsc(type);
        } else if (enabled != null) {
            equipment = equipmentRepository.findByEnabledOrderByEquipmentCodeAsc(enabled);
        } else {
            equipment = equipmentRepository.findAllByOrderByEquipmentCodeAsc();
        }
        return equipment.stream().map(EquipmentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public EquipmentResponse findById(Long id) {
        return EquipmentResponse.from(requireEquipment(id));
    }

    @Transactional
    public EquipmentResponse create(CreateEquipmentRequest request) {
        String code = request.equipmentCode().trim().toUpperCase(Locale.ROOT);
        if (equipmentRepository.existsByEquipmentCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_EQUIPMENT_CODE",
                    "Equipment code already exists.");
        }
        Equipment equipment = Equipment.builder()
                .equipmentCode(code)
                .equipmentType(request.equipmentType())
                .displayName(request.displayName().trim())
                .location(request.location().trim())
                .description(trimToNull(request.description()))
                .enabled(true)
                .build();
        return EquipmentResponse.from(equipmentRepository.save(equipment));
    }

    @Transactional
    public EquipmentResponse update(Long id, UpdateEquipmentRequest request) {
        Equipment equipment = requireEquipment(id);
        equipment.setDisplayName(request.displayName().trim());
        equipment.setLocation(request.location().trim());
        equipment.setDescription(trimToNull(request.description()));
        return EquipmentResponse.from(equipment);
    }

    @Transactional
    public EquipmentResponse setEnabled(Long id, EquipmentEnabledRequest request) {
        Equipment equipment = requireEquipment(id);
        equipment.setEnabled(request.enabled());
        return EquipmentResponse.from(equipment);
    }

    public Equipment requireEquipment(Long id) {
        return equipmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "EQUIPMENT_NOT_FOUND",
                        "Equipment was not found."));
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
