package rd.dalventa.api.superadmin.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_actions")
@Getter
@NoArgsConstructor
public class AdminAction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(name = "tenant_id")
    private UUID tenantId;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public AdminAction(String actorEmail, String action, UUID tenantId, String detail) {
        this.actorEmail = actorEmail;
        this.action = action;
        this.tenantId = tenantId;
        this.detail = detail;
    }
}
