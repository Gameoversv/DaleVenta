package rd.dalventa.api.permission;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.RolePermission;
import rd.dalventa.api.permission.repository.RolePermissionRepository;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RolePermissionRepositoryTest {

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    @Test
    void findByRole_returnsOnlyThatRolesPermissions() {
        // The migration seeds CASHIER with: INVENTORY_VIEW, SALE_CREATE, CASHSHIFT_OPEN,
        // CASHSHIFT_CLOSE, CUSTOMER_CREATE, CREDIT_RECEIVE_PAYMENT
        // and ADMIN with all permissions.
        // This test verifies the repository can filter by role correctly.

        var cashierPerms = rolePermissionRepository.findByRole(RoleName.CASHIER);
        var adminPerms = rolePermissionRepository.findByRole(RoleName.ADMIN);

        // Verify CASHIER has the expected seeded permissions
        assertThat(cashierPerms.stream().map(RolePermission::getCode))
                .contains(PermissionCode.SALE_CREATE)
                .doesNotContain(PermissionCode.USERS_MANAGE); // USERS_MANAGE is only for ADMIN

        // Verify ADMIN has more permissions than CASHIER
        assertThat(adminPerms.size()).isGreaterThan(cashierPerms.size());

        // Verify no overlap in what we're checking
        assertThat(adminPerms.stream().map(RolePermission::getCode))
                .contains(PermissionCode.USERS_MANAGE)
                .contains(PermissionCode.SALE_CREATE);
    }
}
