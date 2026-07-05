package rd.dalventa.api.superadmin.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.superadmin.domain.AdminAction;

import java.util.UUID;

public interface AdminActionRepository extends JpaRepository<AdminAction, UUID> {
    Page<AdminAction> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<AdminAction> findByTenantIdOrderByCreatedAtDesc(UUID tenantId, Pageable pageable);
}
