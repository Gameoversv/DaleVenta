package rd.dalventa.api.shared;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.repository.RoleRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantStatus;
import rd.dalventa.api.tenant.repository.TenantRepository;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email:admin@dalventa.rd}")
    private String adminEmail;

    @Value("${app.seed.admin-password:admin123}")
    private String adminPassword;

    @Value("${app.seed.admin-name:Administrador}")
    private String adminName;

    @Value("${app.seed.super-admin-email:superadmin@dalventa.rd}")
    private String superAdminEmail;

    @Value("${app.seed.super-admin-password:superadmin123}")
    private String superAdminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var ownerRole = roleRepository.findByName(RoleName.OWNER)
                .orElseThrow(() -> new IllegalStateException("Rol OWNER no encontrado — verificar migración V2"));

        // Demo taller the default admin belongs to, so it is reachable/manageable
        // from the super-admin (e.g. password reset). Reused by slug if it exists.
        var demoTenant = tenantRepository.findBySlug("taller-demo").orElseGet(() -> {
            var t = new Tenant("Taller Demo", "taller-demo");
            t.setStatus(TenantStatus.ACTIVE);
            return tenantRepository.save(t);
        });

        var existingAdmin = userRepository.findByEmail(adminEmail).orElse(null);
        if (existingAdmin == null) {
            var admin = new User(adminName, adminEmail,
                    passwordEncoder.encode(adminPassword), demoTenant.getId());
            admin.addRole(ownerRole);
            userRepository.save(admin);
            log.info("Admin creado: {} / {} (taller {})", adminEmail, adminPassword, demoTenant.getSlug());
        } else if (existingAdmin.getTenantId() == null) {
            // Repair earlier seeds where the admin was created without a taller.
            existingAdmin.setTenantId(demoTenant.getId());
            userRepository.save(existingAdmin);
            log.info("Admin {} vinculado al taller {}", adminEmail, demoTenant.getSlug());
        }

        if (!userRepository.existsByEmail(superAdminEmail)) {
            var superAdminRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Rol SUPER_ADMIN no encontrado"));
            var superAdmin = new User("Super Admin", superAdminEmail, passwordEncoder.encode(superAdminPassword));
            superAdmin.addRole(superAdminRole);
            userRepository.save(superAdmin);
            log.info("Super Admin creado: {} / {}", superAdminEmail, superAdminPassword);
        }
    }
}
