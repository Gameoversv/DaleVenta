package rd.dalventa.api.auth.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.BaseEntity;

/**
 * Serializable because {@code User} implements {@code UserDetails}, which extends
 * {@code Serializable}, and holds a {@code Set<Role>}. Marking the field {@code transient} instead
 * is not an option: JPA would stop mapping it.
 */
@Getter
@NoArgsConstructor
@Entity
@Table(name = "roles")
public class Role extends BaseEntity implements java.io.Serializable {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 50)
    private RoleName name;

    public Role(RoleName name) {
        this.name = name;
    }

    public String getAuthority() {
        return "ROLE_" + name.name();
    }
}
