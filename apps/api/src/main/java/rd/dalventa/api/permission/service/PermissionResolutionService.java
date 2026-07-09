package rd.dalventa.api.permission.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;
import rd.dalventa.api.permission.domain.UserPermission;
import rd.dalventa.api.permission.repository.RolePermissionRepository;
import rd.dalventa.api.permission.repository.UserPermissionRepository;

import java.util.EnumSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PermissionResolutionService {

    private final RolePermissionRepository rolePermissionRepository;
    private final UserPermissionRepository userPermissionRepository;

    public Set<PermissionCode> resolveAll(User user) {
        Set<PermissionCode> effective = EnumSet.noneOf(PermissionCode.class);
        user.getRoles().forEach(role ->
                rolePermissionRepository.findByRole(role.getName())
                        .forEach(rp -> effective.add(rp.getCode())));

        for (UserPermission override : userPermissionRepository.findByUserId(user.getId())) {
            if (override.getEffect() == PermissionEffect.GRANT) {
                effective.add(override.getCode());
            } else {
                effective.remove(override.getCode());
            }
        }
        if (isAdmin(user)) {
            effective.addAll(EnumSet.allOf(PermissionCode.class));
        }
        return effective;
    }

    public boolean has(User user, PermissionCode code) {
        return resolveAll(user).contains(code);
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName() == RoleName.ADMIN);
    }
}
