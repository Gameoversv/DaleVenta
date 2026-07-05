package rd.dalventa.api.permission.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.permission.domain.RolePermission;

import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermission, UUID> {
    List<RolePermission> findByRole(RoleName role);
}
