package rd.dalventa.api.sale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {
    Optional<Sale> findByIdAndTenantId(UUID id, UUID tenantId);
    List<Sale> findAllByTenantIdAndRegisterId(UUID tenantId, UUID registerId);
    List<Sale> findAllByTenantIdAndRegisterIdOrderByCreatedAtDesc(UUID tenantId, UUID registerId);
    List<Sale> findAllByTenantIdAndCashShiftId(UUID tenantId, UUID cashShiftId);
    long countByTenantIdAndStatusAndCreatedAtGreaterThanEqual(UUID tenantId, SaleStatus status, Instant createdAt);

    @Query("""
            select coalesce(sum(s.total), 0)
            from Sale s
            where s.tenantId = :tenantId
              and s.status = :status
              and s.createdAt >= :createdAt
            """)
    BigDecimal sumTotalSince(UUID tenantId, SaleStatus status, Instant createdAt);
}
