package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.Alarm;
import com.faultmonitor.backend.entity.AlarmStatus;
import com.faultmonitor.backend.entity.SubsystemType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlarmRepository extends JpaRepository<Alarm, Long> {

    List<Alarm> findByStatus(AlarmStatus status);

    List<Alarm> findBySubsystemTypeAndStatus(SubsystemType subsystemType, AlarmStatus status);

    Optional<Alarm> findByAlarmCodeAndSubsystemIdAndStatus(
            String alarmCode, String subsystemId, AlarmStatus status);

    long countBySubsystemTypeAndStatus(SubsystemType subsystemType, AlarmStatus status);

    List<Alarm> findByEquipmentIsNull();
}
