package rd.dalventa.api.permission.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;

@Slf4j
@Component("permissionService")
@RequiredArgsConstructor
public class PermissionExpressionService {

    private final PermissionResolutionService permissionResolutionService;

    public boolean has(String code) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return false;
        }
        try {
            return permissionResolutionService.has(user, PermissionCode.valueOf(code));
        } catch (IllegalArgumentException ex) {
            // A malformed permission code is an annotation-literal typo, not attacker input —
            // fail closed (403) instead of leaking an enum error message via a 400 response.
            log.error("Unknown PermissionCode '{}' referenced in an @PreAuthorize expression", code);
            return false;
        }
    }
}
