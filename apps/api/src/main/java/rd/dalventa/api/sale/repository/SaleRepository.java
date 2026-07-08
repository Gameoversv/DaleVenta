package rd.dalventa.api.sale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
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
    List<Sale> findAllByTenantIdAndRegisterIdAndUserIdOrderByCreatedAtDesc(UUID tenantId, UUID registerId, UUID userId);
    List<Sale> findAllByTenantIdAndCustomerIdAndUserIdOrderByCreatedAtDesc(UUID tenantId, UUID customerId, UUID userId);
    List<Sale> findAllByTenantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            UUID tenantId, Instant start, Instant end);
    List<Sale> findAllByTenantIdAndRegisterIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
            UUID tenantId, UUID registerId, Instant start, Instant end);
    List<Sale> findAllByTenantIdAndCashShiftId(UUID tenantId, UUID cashShiftId);
    List<Sale> findAllByTenantIdAndCustomerIdOrderByCreatedAtDesc(UUID tenantId, UUID customerId);
    long countByTenantIdAndStatusAndCreatedAtGreaterThanEqual(UUID tenantId, SaleStatus status, Instant createdAt);

    @Query("""
            select coalesce(sum(s.total), 0)
            from Sale s
            where s.tenantId = :tenantId
              and s.status = :status
              and s.createdAt >= :createdAt
            """)
    BigDecimal sumTotalSince(UUID tenantId, SaleStatus status, Instant createdAt);

    @Query("select coalesce(max(s.invoiceSequence), 0) from Sale s where s.tenantId = :tenantId")
    long maxInvoiceSequence(UUID tenantId);

    @Query("""
            SELECT s FROM Sale s
            WHERE s.tenantId = :tenantId
            AND (LOWER(s.invoiceNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(s.fiscalNcf) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY s.createdAt DESC
            """)
    List<Sale> searchInvoices(UUID tenantId, String q, Pageable pageable);

    @Query("""
            SELECT s FROM Sale s
            WHERE s.tenantId = :tenantId
            AND s.userId = :userId
            AND (LOWER(s.invoiceNumber) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(s.fiscalNcf) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY s.createdAt DESC
            """)
    List<Sale> searchOwnInvoices(UUID tenantId, UUID userId, String q, Pageable pageable);
}
