package rd.dalventa.api.product.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.product.domain.Product;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {
    List<Product> findAllByTenantIdAndActiveTrue(UUID tenantId);
    Optional<Product> findByIdAndTenantId(UUID id, UUID tenantId);
    boolean existsByTenantIdAndInternalCode(UUID tenantId, String internalCode);
    boolean existsByTenantIdAndBarcode(UUID tenantId, String barcode);
}
