package rd.dalventa.api.cashshift.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CashShiftDenominationRepository extends JpaRepository<CashShiftDenomination, UUID> {
    List<CashShiftDenomination> findAllByCashShiftId(UUID cashShiftId);
    Optional<CashShiftDenomination> findByCashShiftIdAndDenominationId(UUID cashShiftId, UUID denominationId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select csd from CashShiftDenomination csd where csd.cashShiftId = :cashShiftId and csd.denominationId = :denominationId")
    Optional<CashShiftDenomination> lockByCashShiftIdAndDenominationId(UUID cashShiftId, UUID denominationId);
}
