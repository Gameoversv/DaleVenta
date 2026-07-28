package rd.dalventa.api.audit.web;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.audit.dto.AuditLogResponse;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.UUID;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("@permissionService.has('AUDIT_VIEW')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ApiResponse<Iterable<AuditLogResponse>> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) UUID entityId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        var result = resolve(entityType, entityId, pageable);
        return ApiResponse.paged(result.getContent(), result.getTotalElements(), page, size);
    }

    /**
     * The audit screen filters by kind and sends `entityType` on its own. That case used to fall
     * through to the unfiltered listing, so the dropdown looked like it worked and quietly changed
     * nothing. An `entityId` without a type is meaningless on its own and stays unfiltered.
     */
    private Page<AuditLogResponse> resolve(String entityType, UUID entityId, Pageable pageable) {
        if (entityType == null || entityType.isBlank()) {
            return auditLogService.list(pageable);
        }
        return entityId != null
                ? auditLogService.listForEntity(entityType, entityId, pageable)
                : auditLogService.listForEntityType(entityType, pageable);
    }
}
