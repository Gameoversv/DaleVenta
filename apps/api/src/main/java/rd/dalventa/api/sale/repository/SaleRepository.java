package rd.dalventa.api.sale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.sale.domain.Sale;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {
    Optional<Sale> findByIdAndTenantId(UUID id, UUID tenantId);
    List<Sale> findAllByTenantIdAndRegisterId(UUID tenantId, UUID registerId);
    List<Sale> findAllByTenantIdAndCashShiftId(UUID tenantId, UUID cashShiftId);
}
