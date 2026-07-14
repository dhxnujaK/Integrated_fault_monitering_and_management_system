package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AlarmRepository extends JpaRepository<Alarm, Long> {

    List<Alarm> findByStatus(AlarmStatus status);

    List<Alarm> findBySubsystemTypeAndStatus(SubsystemType subsystemType, AlarmStatus status);

    Optional<Alarm> findByAlarmCodeAndSubsystemIdAndStatus(
            String alarmCode, String subsystemId, AlarmStatus status);

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
}
