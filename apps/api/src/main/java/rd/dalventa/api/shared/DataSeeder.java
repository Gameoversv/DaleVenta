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
import rd.dalventa.api.denomination.service.DenominationService;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantStatus;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Creates the bootstrap admin and super-admin on an empty database.
 *
 * <p>Two rules keep the bootstrap accounts from becoming a permanent backdoor:
 * <ul>
 *   <li>Passwords are never logged, and never shipped as a literal default. When no password is
 *       configured, a random one is generated and printed once so the operator can sign in and
 *       change it.</li>
 *   <li>An existing user's password is never rewritten unless {@code app.seed.reset-passwords} is
 *       explicitly enabled. Otherwise a password changed through the UI silently reverted to the
 *       seed value on the next restart, making rotation impossible.</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final TenantRepository tenantRepository;
    private final DenominationService denominationService;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin-email:admin@dalventa.rd}")
    private String adminEmail;

    @Value("${app.seed.admin-password:}")
    private String adminPassword;

    @Value("${app.seed.admin-name:Administrador}")
    private String adminName;

    @Value("${app.seed.super-admin-email:superadmin@dalventa.rd}")
    private String superAdminEmail;

    @Value("${app.seed.super-admin-password:}")
    private String superAdminPassword;

    /**
     * Opt-in escape hatch for a locked-out operator. Off by default: leaving it on turns every
     * restart into a password reset of the two most privileged accounts in the system.
     */
    @Value("${app.seed.reset-passwords:false}")
    private boolean resetPasswords;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        var adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado — verificar migración V2"));

        // Demo tenant the default admin belongs to, so it is reachable/manageable
        // from the super-admin (e.g. password reset). Reused by slug if it exists.
        var demoTenant = tenantRepository.findBySlug("dalventa-demo").orElseGet(() -> {
            var t = new Tenant("DaleVenta Demo", "dalventa-demo");
            t.setStatus(TenantStatus.ACTIVE);
            return tenantRepository.save(t);
        });
        denominationService.seedDefaultsIfMissing(demoTenant.getId());

        var existingAdmin = userRepository.findByEmail(adminEmail).orElse(null);
        if (existingAdmin == null) {
            var admin = new User(adminName, adminEmail,
                    passwordEncoder.encode(passwordFor(adminPassword, adminEmail, "app.seed.admin-password")),
                    demoTenant.getId());
            admin.addRole(adminRole);
            userRepository.save(admin);
            log.info("Admin creado: {} (tenant {})", adminEmail, demoTenant.getSlug());
        } else if (existingAdmin.getTenantId() == null) {
            // Repair earlier seeds where the admin was created without a tenant.
            existingAdmin.setTenantId(demoTenant.getId());
            userRepository.save(existingAdmin);
            log.info("Admin {} vinculado al tenant {}", adminEmail, demoTenant.getSlug());
            syncSeedPassword(existingAdmin, adminPassword, "Admin");
        } else {
            syncSeedPassword(existingAdmin, adminPassword, "Admin");
        }

        var existingSuperAdmin = userRepository.findByEmail(superAdminEmail).orElse(null);
        if (existingSuperAdmin == null) {
            var superAdminRole = roleRepository.findByName(RoleName.SUPER_ADMIN)
                    .orElseThrow(() -> new IllegalStateException("Rol SUPER_ADMIN no encontrado"));
            var superAdmin = new User("Super Admin", superAdminEmail, passwordEncoder.encode(
                    passwordFor(superAdminPassword, superAdminEmail, "app.seed.super-admin-password")));
            superAdmin.addRole(superAdminRole);
            userRepository.save(superAdmin);
            log.info("Super Admin creado: {}", superAdminEmail);
        } else {
            syncSeedPassword(existingSuperAdmin, superAdminPassword, "Super Admin");
        }
    }

    /**
     * Rewrites an existing account's password only when the deployment explicitly asks for it.
     * Without the flag a rotated password stays rotated.
     */
    private void syncSeedPassword(User user, String seedPassword, String label) {
        if (!resetPasswords || seedPassword == null || seedPassword.isBlank()) {
            return;
        }
        if (!passwordEncoder.matches(seedPassword, user.getPassword())) {
            user.setPassword(passwordEncoder.encode(seedPassword));
            userRepository.save(user);
            log.warn("{} seed password reset for {} because app.seed.reset-passwords is enabled. "
                    + "Disable the flag once you have signed in.", label, user.getEmail());
        }
    }

    private String passwordFor(String configured, String email, String property) {
        if (configured != null && !configured.isBlank()) {
            return configured;
        }
        var generated = generatePassword();
        log.warn("""
                No se configuro {}. Se genero una contrasena aleatoria para {}:

                    {}

                Anotala ahora: no se volvera a mostrar. Cambiala tras el primer inicio de sesion.""",
                property, email, generated);
        return generated;
    }

    private String generatePassword() {
        var bytes = new byte[18];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
