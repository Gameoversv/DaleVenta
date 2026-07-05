package rd.dalventa.api.inventory.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.inventory.domain.Product;
import rd.dalventa.api.inventory.domain.ProductCategory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

    @Query("""
            SELECT p FROM Product p
            WHERE p.tenantId = :tenantId
              AND p.active = true
              AND (:category IS NULL OR p.category = :category)
              AND (:lowStock = false OR p.currentStock <= p.minStock)
            ORDER BY p.internalCode ASC
            """)
    Page<Product> search(
            @Param("tenantId") UUID tenantId,
            @Param("category") ProductCategory category,
            @Param("lowStock") boolean lowStock,
            Pageable pageable
    );

    @Query("SELECT p FROM Product p WHERE p.tenantId = :tenantId AND p.active = true AND p.currentStock <= p.minStock ORDER BY p.currentStock ASC")
    List<Product> findLowStock(@Param("tenantId") UUID tenantId);

    Optional<Product> findByIdAndTenantIdAndActiveTrue(UUID id, UUID tenantId);

    boolean existsByInternalCodeAndTenantIdAndActiveTrue(String internalCode, UUID tenantId);

    @Query("SELECT COUNT(p) FROM Product p WHERE p.tenantId = :tenantId AND p.active = true AND p.currentStock <= p.minStock")
    long countLowStock(@Param("tenantId") UUID tenantId);
}
