package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.superadmin.domain.AdminAction;

import java.time.Instant;
import java.util.UUID;

public record AdminActionResponse(
        UUID id,
        @JsonProperty("actorEmail") String actorEmail,
        String action,
        @JsonProperty("tenantId") UUID tenantId,
        String detail,
        @JsonProperty("createdAt") Instant createdAt
) {
    public static AdminActionResponse from(AdminAction a) {
        return new AdminActionResponse(
                a.getId(), a.getActorEmail(), a.getAction(),
                a.getTenantId(), a.getDetail(), a.getCreatedAt()
        );
    }
}
