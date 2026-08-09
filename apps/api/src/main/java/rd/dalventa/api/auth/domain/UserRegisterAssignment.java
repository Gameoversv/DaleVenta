package rd.dalventa.api.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.BaseEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(
        name = "user_register_assignments",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_register_assignments", columnNames = {"user_id", "register_id"})
)
public class UserRegisterAssignment extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "register_id", nullable = false, updatable = false)
    private UUID registerId;

    public UserRegisterAssignment(UUID userId, UUID registerId) {
        this.userId = userId;
        this.registerId = registerId;
    }
}
