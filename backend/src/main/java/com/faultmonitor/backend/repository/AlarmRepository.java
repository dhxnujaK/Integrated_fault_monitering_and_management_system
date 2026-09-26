package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.SubsystemType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlarmRepository extends JpaRepository<Alarm, Long>, JpaSpecificationExecutor<Alarm> {

    List<Alarm> findByStatus(AlarmStatus status);

    List<Alarm> findBySubsystemTypeAndStatus(SubsystemType subsystemType, AlarmStatus status);

    Optional<Alarm> findByAlarmCodeAndSubsystemIdAndStatus(
            String alarmCode, String subsystemId, AlarmStatus status);

    List<Alarm> findByEquipmentIdAndAlarmCodeAndStatusIn(
            Long equipmentId, String alarmCode, Collection<AlarmStatus> statuses);

    List<Alarm> findByEquipmentIdAndStatusInOrderBySeverityAscTriggeredAtDesc(
            Long equipmentId, Collection<AlarmStatus> statuses);

    List<Alarm> findByEquipmentIdOrderBySeverityAscTriggeredAtDesc(Long equipmentId);

    long countBySubsystemTypeAndStatus(SubsystemType subsystemType, AlarmStatus status);

    List<Alarm> findByEquipmentIsNull();

    long countByEquipmentIdAndStatus(Long equipmentId, AlarmStatus status);

    long countByStatus(AlarmStatus status);

    boolean existsByEquipmentIdAndStatusNotAndSeverity(
            Long equipmentId, AlarmStatus status, com.faultmonitor.backend.entity.AlarmSeverity severity);

    @Query("select count(a) from Alarm a where a.status <> :resolved and a.severity = :severity")
    long countUnresolvedBySeverity(
            @Param("severity") com.faultmonitor.backend.entity.AlarmSeverity severity,
            @Param("resolved") AlarmStatus resolved);

    /** Used by the report engine: all axes are optional except the date range. */
    @Query("SELECT a FROM Alarm a WHERE "
            + "(:equipmentId IS NULL OR (a.equipment IS NOT NULL AND a.equipment.id = :equipmentId)) AND "
            + "(:subsystemType IS NULL OR a.subsystemType = :subsystemType) AND "
            + "a.triggeredAt >= :from AND a.triggeredAt <= :to "
            + "ORDER BY a.triggeredAt DESC")
    List<Alarm> findForReport(
            @Param("equipmentId") Long equipmentId,
            @Param("subsystemType") SubsystemType subsystemType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);
}
