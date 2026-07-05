package rd.dalventa.api.credit.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.credit.domain.CreditAccount;

import java.util.Optional;
import java.util.UUID;

public interface CreditAccountRepository extends JpaRepository<CreditAccount, UUID> {
    Optional<CreditAccount> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ca from CreditAccount ca where ca.customerId = :customerId and ca.tenantId = :tenantId")
    Optional<CreditAccount> lockByCustomerIdAndTenantId(UUID customerId, UUID tenantId);
}
