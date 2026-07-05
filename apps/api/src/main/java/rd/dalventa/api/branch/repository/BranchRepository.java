package rd.dalventa.api.branch.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.branch.domain.Branch;

import java.util.List;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    List<Branch> findAllByTenantIdAndActiveTrue(UUID tenantId);
    long countByTenantIdAndActiveTrue(UUID tenantId);
}
