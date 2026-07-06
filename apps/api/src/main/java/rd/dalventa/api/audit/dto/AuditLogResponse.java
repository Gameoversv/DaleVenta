package rd.dalventa.api.audit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.audit.domain.AuditLog;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        @JsonProperty("actorUserId") UUID actorUserId,
        String action,
        @JsonProperty("entityType") String entityType,
        @JsonProperty("entityId") UUID entityId,
        String reason,
        @JsonProperty("createdAt") Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), log.getAction(),
                log.getEntityType(), log.getEntityId(), log.getReason(), log.getCreatedAt());
    }
}
