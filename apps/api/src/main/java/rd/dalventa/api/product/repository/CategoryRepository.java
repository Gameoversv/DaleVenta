package rd.dalventa.api.product.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.product.domain.Category;

import java.util.List;
import java.util.UUID;

public interface CategoryRepository extends JpaRepository<Category, UUID> {
    List<Category> findAllByTenantIdAndActiveTrue(UUID tenantId);
}
