package rd.dalventa.api.reminder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.reminder.domain.Reminder;
import rd.dalventa.api.reminder.domain.ReminderStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReminderRepository extends JpaRepository<Reminder, UUID> {

    List<Reminder> findByTenantIdAndActiveTrue(UUID tenantId);

    List<Reminder> findByTenantIdAndVehicle_IdAndActiveTrue(UUID tenantId, UUID vehicleId);

    List<Reminder> findByTenantIdAndStatusAndActiveTrue(UUID tenantId, ReminderStatus status);

    Optional<Reminder> findByIdAndTenantIdAndActiveTrue(UUID id, UUID tenantId);

    @Query("SELECT r FROM Reminder r WHERE r.tenantId = :tenantId AND r.active = true " +
           "AND (r.nextDate IS NOT NULL AND r.nextDate <= :threshold) " +
           "AND r.status <> 'COMPLETED'")
    List<Reminder> findDueSoon(@Param("tenantId") UUID tenantId,
                                @Param("threshold") LocalDate threshold);

    @Query("SELECT r FROM Reminder r WHERE r.active = true AND r.status <> 'COMPLETED'")
    List<Reminder> findAllActiveNotCompleted();
}
