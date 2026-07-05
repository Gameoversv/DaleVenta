package rd.dalventa.api.purchase.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.purchase.domain.Purchase;

import java.util.Optional;
import java.util.UUID;

public interface PurchaseRepository extends JpaRepository<Purchase, UUID> {

    @Query("SELECT p FROM Purchase p JOIN FETCH p.supplier WHERE p.tenantId = :tenantId ORDER BY p.purchaseDate DESC")
    Page<Purchase> findAllWithSupplier(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT p FROM Purchase p JOIN FETCH p.supplier LEFT JOIN FETCH p.items i LEFT JOIN FETCH i.product WHERE p.id = :id AND p.tenantId = :tenantId")
    Optional<Purchase> findByIdWithDetails(@Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
