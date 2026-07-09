package rd.dalventa.api.purchase.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.purchase.domain.PurchasePayment;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public interface PurchasePaymentRepository extends JpaRepository<PurchasePayment, UUID> {
    List<PurchasePayment> findAllByTenantIdAndPurchaseIdOrderByPaidAtDesc(UUID tenantId, UUID purchaseId);
    List<PurchasePayment> findAllByTenantIdAndPurchaseIdIn(UUID tenantId, List<UUID> purchaseIds);

    @Query("select coalesce(sum(p.amount), 0) from PurchasePayment p where p.tenantId = :tenantId and p.purchaseId = :purchaseId")
    BigDecimal sumByTenantIdAndPurchaseId(UUID tenantId, UUID purchaseId);
}
