package rd.dalventa.api.purchase.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.purchase.domain.PurchaseItem;

import java.util.List;
import java.util.UUID;

public interface PurchaseItemRepository extends JpaRepository<PurchaseItem, UUID> {
    List<PurchaseItem> findAllByPurchaseId(UUID purchaseId);
}
