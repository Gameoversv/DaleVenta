package rd.dalventa.api.quotation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.quotation.domain.Quotation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuotationRepository extends JpaRepository<Quotation, UUID> {
    List<Quotation> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    Optional<Quotation> findByIdAndTenantId(UUID id, UUID tenantId);

    @Query(value = "select coalesce(max(cast(substring(quotation_number from 4) as bigint)), 0) from quotations where tenant_id = :tenantId", nativeQuery = true)
    long maxQuotationSequence(@Param("tenantId") UUID tenantId);
}
