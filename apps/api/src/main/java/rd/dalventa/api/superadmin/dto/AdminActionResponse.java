package rd.dalventa.api.superadmin.dto;

import rd.dalventa.api.superadmin.domain.AdminAction;

import java.time.Instant;
import java.util.UUID;

public record AdminActionResponse(
        UUID id,
        String actorEmail,
        String action,
        UUID tenantId,
        String detail,
        Instant createdAt
) {
    public static AdminActionResponse from(AdminAction a) {
        return new AdminActionResponse(
                a.getId(), a.getActorEmail(), a.getAction(),
                a.getTenantId(), a.getDetail(), a.getCreatedAt()
        );
    }
}
