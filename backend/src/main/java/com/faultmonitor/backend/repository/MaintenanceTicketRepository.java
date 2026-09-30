package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.entity.TicketStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket, Long> {

    List<MaintenanceTicket> findByStatus(TicketStatus status);

    List<MaintenanceTicket> findBySubsystemTypeAndStatus(
            SubsystemType subsystemType, TicketStatus status);

    List<MaintenanceTicket> findByEquipmentIsNull();

    @Query("SELECT t FROM MaintenanceTicket t WHERE "
            + "(:status IS NULL OR t.status = :status) AND "
            + "(:equipmentType IS NULL OR t.subsystemType = :equipmentType) AND "
            + "(:equipmentId IS NULL OR (t.equipment IS NOT NULL AND t.equipment.id = :equipmentId))")
    Page<MaintenanceTicket> findFiltered(
            @Param("status") TicketStatus status,
            @Param("equipmentType") SubsystemType equipmentType,
            @Param("equipmentId") Long equipmentId,
            Pageable pageable);

    /** Used by the report engine: all axes are optional except the date range. */
    @Query("SELECT t FROM MaintenanceTicket t WHERE "
            + "(:equipmentId IS NULL OR (t.equipment IS NOT NULL AND t.equipment.id = :equipmentId)) AND "
            + "(:subsystemType IS NULL OR t.subsystemType = :subsystemType) AND "
            + "t.createdAt >= :from AND t.createdAt <= :to "
            + "ORDER BY t.createdAt DESC")
    List<MaintenanceTicket> findForReport(
            @Param("equipmentId") Long equipmentId,
            @Param("subsystemType") SubsystemType subsystemType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
