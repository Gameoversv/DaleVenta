package rd.dalventa.api.audit.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.domain.AuditLog;
import rd.dalventa.api.audit.dto.AuditLogResponse;
import rd.dalventa.api.audit.repository.AuditLogRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void record(AuditAction action, String entityType, UUID entityId, UUID actorUserId, String reason) {
        var log = new AuditLog(actorUserId, action.name(), entityType, entityId, reason);
        log.setTenantId(TenantContext.require());
        auditLogRepository.save(log);
    }

    public Page<AuditLogResponse> list(Pageable pageable) {
        var tenantId = TenantContext.require();
        return auditLogRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(log -> AuditLogResponse.from(log, actorName(log.getActorUserId())));
    }

    public Page<AuditLogResponse> listForEntity(String entityType, UUID entityId, Pageable pageable) {
        var tenantId = TenantContext.require();
        return auditLogRepository
                .findAllByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(tenantId, entityType, entityId, pageable)
                .map(log -> AuditLogResponse.from(log, actorName(log.getActorUserId())));
    }

    private String actorName(UUID actorUserId) {
        return userRepository.findById(actorUserId)
                .map(user -> user.getName() + " (" + user.getEmail() + ")")
                .orElse(actorUserId.toString());
    }
}
