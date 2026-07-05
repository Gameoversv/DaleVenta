package rd.dalventa.api.credit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.credit.domain.CreditTransaction;

import java.util.List;
import java.util.UUID;

public interface CreditTransactionRepository extends JpaRepository<CreditTransaction, UUID> {
    List<CreditTransaction> findAllByTenantIdAndCreditAccountId(UUID tenantId, UUID creditAccountId);
    List<CreditTransaction> findAllByTenantIdAndSaleId(UUID tenantId, UUID saleId);
}
