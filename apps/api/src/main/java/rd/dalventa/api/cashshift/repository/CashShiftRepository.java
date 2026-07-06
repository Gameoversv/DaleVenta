package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.time.Instant;

public interface CashShiftRepository extends JpaRepository<CashShift, UUID> {
    Optional<CashShift> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<CashShift> findByRegisterIdAndStatus(UUID registerId, CashShiftStatus status);
    List<CashShift> findAllByTenantIdAndRegisterId(UUID tenantId, UUID registerId);
    List<CashShift> findAllByTenantIdAndRegisterIdAndOpenedAtGreaterThanEqualAndOpenedAtLessThan(
            UUID tenantId, UUID registerId, Instant start, Instant end);
    List<CashShift> findAllByTenantIdAndOpenedAtGreaterThanEqualAndOpenedAtLessThan(
            UUID tenantId, Instant start, Instant end);
    long countByTenantIdAndStatus(UUID tenantId, CashShiftStatus status);
}
