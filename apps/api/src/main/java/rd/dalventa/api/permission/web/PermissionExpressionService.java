package rd.dalventa.api.permission.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;

@Component("permissionService")
@RequiredArgsConstructor
public class PermissionExpressionService {

    private final PermissionResolutionService permissionResolutionService;

    public boolean has(String code) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof User user)) {
            return false;
        }
        return permissionResolutionService.has(user, PermissionCode.valueOf(code));
    }
}
