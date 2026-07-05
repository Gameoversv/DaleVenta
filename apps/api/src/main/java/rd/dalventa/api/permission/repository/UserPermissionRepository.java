package rd.dalventa.api.permission.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.permission.domain.UserPermission;

import java.util.List;
import java.util.UUID;

public interface UserPermissionRepository extends JpaRepository<UserPermission, UUID> {
    List<UserPermission> findByUserId(UUID userId);
}
