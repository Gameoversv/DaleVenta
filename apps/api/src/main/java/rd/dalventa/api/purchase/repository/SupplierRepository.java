package rd.dalventa.api.purchase.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.purchase.domain.Supplier;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {
    Optional<Supplier> findByIdAndTenantId(UUID id, UUID tenantId);
    Optional<Supplier> findByIdAndTenantIdAndActiveTrue(UUID id, UUID tenantId);

    @Query("""
            SELECT s FROM Supplier s
            WHERE s.tenantId = :tenantId
            AND (:includeInactive = true OR s.active = true)
            AND (:q IS NULL OR :q = ''
                OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(s.contactName) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(s.phone) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY s.name
            """)
    List<Supplier> search(@Param("tenantId") UUID tenantId, @Param("q") String q, @Param("includeInactive") boolean includeInactive);
}
