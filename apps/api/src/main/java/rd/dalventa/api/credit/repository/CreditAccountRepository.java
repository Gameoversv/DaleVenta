package rd.dalventa.api.credit.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.credit.domain.CreditAccount;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CreditAccountRepository extends JpaRepository<CreditAccount, UUID> {
    Optional<CreditAccount> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);

    List<CreditAccount> findByTenantIdAndBalanceGreaterThanOrderByBalanceDesc(UUID tenantId, BigDecimal balance);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select ca from CreditAccount ca where ca.customerId = :customerId and ca.tenantId = :tenantId")
    Optional<CreditAccount> lockByCustomerIdAndTenantId(UUID customerId, UUID tenantId);

    @Query("select coalesce(sum(ca.balance), 0) from CreditAccount ca where ca.tenantId = :tenantId and ca.balance > 0")
    BigDecimal sumPositiveBalance(UUID tenantId);
}
