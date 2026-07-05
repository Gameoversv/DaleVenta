package rd.dalventa.api.purchase.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.purchase.domain.Supplier;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SupplierRepository extends JpaRepository<Supplier, UUID> {

    @Query("SELECT s FROM Supplier s WHERE s.tenantId = :tenantId AND s.active = true AND (:q IS NULL OR :q = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Supplier> search(@Param("tenantId") UUID tenantId, @Param("q") String q, Pageable pageable);

    List<Supplier> findByTenantIdAndActiveTrueOrderByNameAsc(UUID tenantId);

    Optional<Supplier> findByIdAndTenantIdAndActiveTrue(UUID id, UUID tenantId);
}
