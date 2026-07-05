package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashMovement;

import java.util.List;
import java.util.UUID;

public interface CashMovementRepository extends JpaRepository<CashMovement, UUID> {
    List<CashMovement> findAllByTenantIdAndCashShiftId(UUID tenantId, UUID cashShiftId);
}
