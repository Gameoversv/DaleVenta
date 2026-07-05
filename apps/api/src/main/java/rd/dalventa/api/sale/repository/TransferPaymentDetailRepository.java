package rd.dalventa.api.sale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.sale.domain.TransferPaymentDetail;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

public interface TransferPaymentDetailRepository extends JpaRepository<TransferPaymentDetail, UUID> {
    boolean existsByTenantIdAndBankAndReference(UUID tenantId, String bank, String reference);
    Optional<TransferPaymentDetail> findByPaymentId(UUID paymentId);
    List<TransferPaymentDetail> findAllByPaymentIdIn(List<UUID> paymentIds);
}
