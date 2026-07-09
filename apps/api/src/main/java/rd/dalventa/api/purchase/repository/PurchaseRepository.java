package rd.dalventa.api.purchase.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.purchase.domain.Purchase;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PurchaseRepository extends JpaRepository<Purchase, UUID> {
    Optional<Purchase> findByIdAndTenantId(UUID id, UUID tenantId);
    List<Purchase> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    long countByTenantId(UUID tenantId);
}
