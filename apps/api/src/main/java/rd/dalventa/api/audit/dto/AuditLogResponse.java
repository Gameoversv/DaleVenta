package rd.dalventa.api.audit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.audit.domain.AuditLog;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        @JsonProperty("actorUserId") UUID actorUserId,
        @JsonProperty("actorName") String actorName,
        String action,
        @JsonProperty("entityType") String entityType,
        @JsonProperty("entityId") UUID entityId,
        String reason,
        @JsonProperty("createdAt") Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return from(log, null);
    }

    public static AuditLogResponse from(AuditLog log, String actorName) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), actorName, log.getAction(),
                log.getEntityType(), log.getEntityId(), log.getReason(), log.getCreatedAt());
    }
}
