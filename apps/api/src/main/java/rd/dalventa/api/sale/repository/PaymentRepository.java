package rd.dalventa.api.sale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.sale.domain.Payment;

import java.util.List;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findAllBySaleId(UUID saleId);
    List<Payment> findAllByTenantIdAndSaleIdIn(UUID tenantId, List<UUID> saleIds);
}
