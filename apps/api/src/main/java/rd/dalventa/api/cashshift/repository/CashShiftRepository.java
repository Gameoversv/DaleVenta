package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashShiftRepository extends JpaRepository<CashShift, UUID> {
    Optional<CashShift> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<CashShift> findByRegisterIdAndStatus(UUID registerId, CashShiftStatus status);
    List<CashShift> findAllByTenantIdAndRegisterId(UUID tenantId, UUID registerId);
    long countByTenantIdAndStatus(UUID tenantId, CashShiftStatus status);
}
