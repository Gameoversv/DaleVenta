package rd.dalventa.api.permission.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.auth.service.UserManagementService;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;
import rd.dalventa.api.permission.domain.UserPermission;
import rd.dalventa.api.permission.dto.UserPermissionRow;
import rd.dalventa.api.permission.repository.RolePermissionRepository;
import rd.dalventa.api.permission.repository.UserPermissionRepository;
import rd.dalventa.api.shared.security.CurrentUserProvider;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserPermissionAdminService {

    private final UserManagementService userManagementService;
    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public List<UserPermissionRow> list(UUID userId) {
        var user = userManagementService.getTenantStaffUser(userId);

        var rolePermissions = user.getRoles().stream()
                .flatMap(role -> rolePermissionRepository.findByRole(role.getName()).stream())
                .map(rp -> rp.getCode())
                .collect(Collectors.toSet());

        var overrides = userPermissionRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(UserPermission::getCode, UserPermission::getEffect));

        return List.of(PermissionCode.values()).stream()
                .map(code -> {
                    boolean fromRole = rolePermissions.contains(code);
                    var override = overrides.get(code);
                    boolean effective = override == null
                            ? fromRole
                            : override == PermissionEffect.GRANT;
                    return new UserPermissionRow(code, fromRole, override, effective);
                })
                .toList();
    }

    @Transactional
    public void setOverride(UUID userId, PermissionCode code, PermissionEffect effect) {
        userManagementService.getTenantStaffUser(userId);
        var existing = userPermissionRepository.findByUserId(userId).stream()
                .filter(up -> up.getCode() == code)
                .findFirst();
        if (existing.isPresent()) {
            userPermissionRepository.delete(existing.get());
        }
        userPermissionRepository.save(new UserPermission(userId, code, effect));
        logOverride(userId, code, effect.name());
    }

    @Transactional
    public void clearOverride(UUID userId, PermissionCode code) {
        userManagementService.getTenantStaffUser(userId);
        userPermissionRepository.findByUserId(userId).stream()
                .filter(up -> up.getCode() == code)
                .findFirst()
                .ifPresent(userPermissionRepository::delete);
        logOverride(userId, code, "CLEARED");
    }

    private void logOverride(UUID userId, PermissionCode code, String effectLabel) {
        var actorUserId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        auditLogService.recordEvent(AuditAction.USER_PERMISSION_OVERRIDE, "USER", userId, actorUserId,
                code.name() + " -> " + effectLabel);
    }
}
