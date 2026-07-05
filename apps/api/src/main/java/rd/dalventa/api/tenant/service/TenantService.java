package rd.dalventa.api.tenant.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.dto.AuthResponse;
import rd.dalventa.api.auth.dto.UserResponse;
import rd.dalventa.api.auth.repository.RoleRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.auth.service.JwtService;
import rd.dalventa.api.denomination.service.DenominationService;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.dto.RegisterTenantRequest;
import rd.dalventa.api.tenant.dto.TenantPublicResult;
import rd.dalventa.api.tenant.repository.TenantRepository;

import org.springframework.data.domain.PageRequest;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final DenominationService denominationService;

    @Transactional
    public AuthResponse registerTenant(RegisterTenantRequest req) {
        if (userRepository.existsByEmail(req.adminEmail())) {
            throw new IllegalArgumentException("El correo ya está registrado");
        }

        String slug = buildSlug(req.tenantName());
        if (tenantRepository.existsBySlug(slug)) {
            slug = slug + "-" + System.currentTimeMillis() % 10000;
        }

        var tenant = new Tenant(req.tenantName(), slug);
        tenant.setPhone(req.phone());
        tenant.setCity(req.city());
        tenant.setRnc(req.rnc());
        tenant = tenantRepository.save(tenant);
        denominationService.seedDefaults(tenant.getId());

        var adminRole = roleRepository.findByName(RoleName.ADMIN)
                .orElseThrow(() -> new IllegalStateException("Rol ADMIN no encontrado"));

        var admin = new User(req.adminName(), req.adminEmail(),
                passwordEncoder.encode(req.adminPassword()), tenant.getId());
        admin.addRole(adminRole);
        userRepository.save(admin);

        String token = jwtService.generateToken(admin);
        return new AuthResponse(token, UserResponse.from(admin));
    }

    public List<TenantPublicResult> searchPublic(String q) {
        return tenantRepository.searchPublic(q, PageRequest.of(0, 10))
                .stream()
                .map(TenantPublicResult::from)
                .toList();
    }

    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-z0-9]+");

    private String buildSlug(String name) {
        String normalized = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return NON_ALPHANUMERIC.matcher(normalized.toLowerCase(Locale.ROOT))
                .replaceAll("-")
                .replaceAll("^-|-$", "");
    }
}
