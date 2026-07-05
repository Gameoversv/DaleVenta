package rd.dalventa.api.permission.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.shared.domain.BaseEntity;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "role_permissions")
public class RolePermission extends BaseEntity {

    @Enumerated(EnumType.STRING)
    private RoleName role;

    @Enumerated(EnumType.STRING)
    private PermissionCode code;

    public RolePermission(RoleName role, PermissionCode code) {
        this.role = role;
        this.code = code;
    }
}
