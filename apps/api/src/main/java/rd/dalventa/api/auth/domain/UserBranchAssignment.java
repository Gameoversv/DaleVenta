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
        name = "user_branch_assignments",
        uniqueConstraints = @UniqueConstraint(name = "uq_user_branch_assignments", columnNames = {"user_id", "branch_id"})
)
public class UserBranchAssignment extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "branch_id", nullable = false, updatable = false)
    private UUID branchId;

    public UserBranchAssignment(UUID userId, UUID branchId) {
        this.userId = userId;
        this.branchId = branchId;
    }
}
