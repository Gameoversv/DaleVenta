package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.CashMovementDenomination;

import java.util.List;
import java.util.UUID;

public interface CashMovementDenominationRepository extends JpaRepository<CashMovementDenomination, UUID> {
    List<CashMovementDenomination> findAllByCashMovementId(UUID cashMovementId);
}
