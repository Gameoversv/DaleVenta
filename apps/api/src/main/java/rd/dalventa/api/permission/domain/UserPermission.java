package rd.dalventa.api.permission.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.BaseEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "user_permissions")
public class UserPermission extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    private PermissionCode code;

    @Enumerated(EnumType.STRING)
    private PermissionEffect effect;

    public UserPermission(UUID userId, PermissionCode code, PermissionEffect effect) {
        this.userId = userId;
        this.code = code;
        this.effect = effect;
    }
}
