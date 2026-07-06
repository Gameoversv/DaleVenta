package rd.dalventa.api.audit.dto;

import rd.dalventa.api.audit.domain.AuditLog;

import java.time.Instant;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String action,
        String entityType,
        UUID entityId,
        String reason,
        Instant createdAt) {

    public static AuditLogResponse from(AuditLog log) {
        return new AuditLogResponse(log.getId(), log.getActorUserId(), log.getAction(),
                log.getEntityType(), log.getEntityId(), log.getReason(), log.getCreatedAt());
    }
}
