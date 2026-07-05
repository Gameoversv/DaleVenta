package rd.dalventa.api.register.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.register.domain.Register;

import java.util.List;
import java.util.UUID;

public interface RegisterRepository extends JpaRepository<Register, UUID> {
    List<Register> findAllByBranchIdAndActiveTrue(UUID branchId);
    List<Register> findAllByTenantIdAndActiveTrue(UUID tenantId);
}
