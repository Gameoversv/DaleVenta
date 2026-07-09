package rd.dalventa.api.product.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.product.domain.Product;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findAllByTenantId(UUID tenantId);
    List<Product> findAllByTenantIdAndCategoryId(UUID tenantId, UUID categoryId);
    List<Product> findAllByTenantIdAndActiveTrue(UUID tenantId);
    List<Product> findAllByTenantIdAndActive(UUID tenantId, boolean active);
    Optional<Product> findByIdAndTenantId(UUID id, UUID tenantId);
    boolean existsByTenantIdAndInternalCode(UUID tenantId, String internalCode);
    boolean existsByTenantIdAndBarcode(UUID tenantId, String barcode);

    @Query("""
            SELECT p FROM Product p
            WHERE p.tenantId = :tenantId
            AND p.active = true
            AND (:q IS NULL OR :q = ''
                OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(p.internalCode) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(p.barcode) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY p.description
            """)
    List<Product> searchActive(@Param("tenantId") UUID tenantId, @Param("q") String q, Pageable pageable);
}
