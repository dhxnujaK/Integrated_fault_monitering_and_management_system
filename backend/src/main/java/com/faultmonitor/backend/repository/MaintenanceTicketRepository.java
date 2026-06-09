package com.faultmonitor.backend.repository;

import com.faultmonitor.backend.entity.MaintenanceTicket;
import com.faultmonitor.backend.entity.SubsystemType;
import com.faultmonitor.backend.entity.TicketStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MaintenanceTicketRepository extends JpaRepository<MaintenanceTicket, Long> {

    List<MaintenanceTicket> findByStatus(TicketStatus status);

    List<MaintenanceTicket> findBySubsystemTypeAndStatus(
            SubsystemType subsystemType, TicketStatus status);
}
