package rd.dalventa.api.sale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.sale.domain.SaleItem;

import java.util.List;
import java.util.UUID;

public interface SaleItemRepository extends JpaRepository<SaleItem, UUID> {
    List<SaleItem> findAllBySaleId(UUID saleId);
    List<SaleItem> findAllByTenantIdAndSaleIdIn(UUID tenantId, List<UUID> saleIds);
}
