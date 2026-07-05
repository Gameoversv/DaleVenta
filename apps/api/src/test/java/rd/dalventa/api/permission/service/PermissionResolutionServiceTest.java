package rd.dalventa.api.permission.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import rd.dalventa.api.auth.domain.Role;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;
import rd.dalventa.api.permission.domain.RolePermission;
import rd.dalventa.api.permission.domain.UserPermission;
import rd.dalventa.api.permission.repository.RolePermissionRepository;
import rd.dalventa.api.permission.repository.UserPermissionRepository;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PermissionResolutionServiceTest {

    @Mock private RolePermissionRepository rolePermissionRepository;
    @Mock private UserPermissionRepository userPermissionRepository;

    private PermissionResolutionService service;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new PermissionResolutionService(rolePermissionRepository, userPermissionRepository);
    }

    private User cashierUser(UUID userId) {
        var user = new User("Cajero Test", "cajero@test.com", "hash");
        var role = new Role(RoleName.CASHIER);
        user.addRole(role);
        // BaseEntity id is auto-generated; override via reflection-free path: rely on
        // JPA-assigned UUID being present since BaseEntity sets it at construction time.
        return user;
    }

    @Test
    void has_permissionGrantedByRole_returnsTrue() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId())).thenReturn(List.of());

        assertThat(service.has(user, PermissionCode.SALE_CREATE)).isTrue();
    }

    @Test
    void has_permissionNotInRoleOrOverrides_returnsFalse() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId())).thenReturn(List.of());

        assertThat(service.has(user, PermissionCode.SALE_VOID)).isFalse();
    }

    @Test
    void has_individualGrantOverride_addsPermissionNotOnRole() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId()))
                .thenReturn(List.of(new UserPermission(user.getId(), PermissionCode.SALE_VOID, PermissionEffect.GRANT)));

        assertThat(service.has(user, PermissionCode.SALE_VOID)).isTrue();
    }

    @Test
    void has_individualRevokeOverride_removesPermissionFromRole() {
        var user = cashierUser(UUID.randomUUID());
        when(rolePermissionRepository.findByRole(RoleName.CASHIER))
                .thenReturn(List.of(new RolePermission(RoleName.CASHIER, PermissionCode.SALE_CREATE)));
        when(userPermissionRepository.findByUserId(user.getId()))
                .thenReturn(List.of(new UserPermission(user.getId(), PermissionCode.SALE_CREATE, PermissionEffect.REVOKE)));

        assertThat(service.has(user, PermissionCode.SALE_CREATE)).isFalse();
    }
}
