package com.faultmonitor.backend.bootstrap;

import com.faultmonitor.backend.entity.Equipment;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.repository.EquipmentRepository;
import java.util.List;
import org.springframework.core.annotation.Order;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** Seeds only the exact legacy subsystem codes so record backfill is deterministic. */
@Component
@Order(1)
public class EquipmentSeeder implements CommandLineRunner {

    private final EquipmentRepository equipmentRepository;

    public EquipmentSeeder(EquipmentRepository equipmentRepository) {
        this.equipmentRepository = equipmentRepository;
    }

    @Override
    public void run(String... args) {
        List<Equipment> defaults = List.of(
                equipment("GENERATOR-01", SubsystemType.GENERATOR, "Main Standby Generator"),
                equipment("ATS-01", SubsystemType.ATS, "Automatic Transfer Switch"),
                equipment("MDP-01", SubsystemType.MDP, "Main Distribution Panel"),
                equipment("SDP-01", SubsystemType.SDP, "Sub Distribution Panel 01"),
                equipment("SDP-02", SubsystemType.SDP, "Sub Distribution Panel 02"),
                equipment("UPS-01", SubsystemType.UPS, "UPS 01"),
                equipment("UPS-02", SubsystemType.UPS, "UPS 02"));

        defaults.stream()
                .filter(item -> equipmentRepository.findByEquipmentCode(item.getEquipmentCode()).isEmpty())
                .forEach(equipmentRepository::save);
    }

    private Equipment equipment(String code, SubsystemType type, String displayName) {
        return Equipment.builder()
                .equipmentCode(code)
                .equipmentType(type)
                .displayName(displayName)
                .enabled(true)
                .build();
    }
}
