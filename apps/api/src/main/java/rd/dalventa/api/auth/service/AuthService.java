package rd.dalventa.api.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.dto.AuthResponse;
import rd.dalventa.api.auth.dto.ChangePasswordRequest;
import rd.dalventa.api.auth.dto.LoginRequest;
import rd.dalventa.api.auth.dto.RegisterRequest;
import rd.dalventa.api.auth.dto.UserResponse;
import rd.dalventa.api.auth.repository.RoleRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.shared.web.PasswordChangeNotAllowedException;
import rd.dalventa.api.shared.web.TenantSuspendedException;
import rd.dalventa.api.tenant.repository.TenantRepository;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final TenantRepository tenantRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("El correo ya esta registrado");
        }

        var user = new User(request.name(), request.email(), passwordEncoder.encode(request.password()));

        RoleName roleName = request.role() != null ? request.role() : RoleName.CLIENT;
        var role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Rol no encontrado: " + roleName));
        user.addRole(role);

        userRepository.save(user);
        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserResponse.from(user));
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password())
        );
        var user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        // Deny access to users whose tenant (taller) is suspended or cancelled.
        // SUPER_ADMIN has no tenant and is never blocked.
        if (user.getTenantId() != null) {
            tenantRepository.findById(user.getTenantId())
                    .filter(t -> t.getStatus().blocksAccess())
                    .ifPresent(t -> {
                        throw new TenantSuspendedException(
                                "Tu taller está suspendido. Contacta a soporte.");
                    });
        }

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserResponse.from(user));
    }

    /**
     * Self-service password change for staff. Taller OWNERs are not allowed —
     * they must contact a super-admin for a reset.
     */
    @Transactional
    public void changeOwnPassword(String email, ChangePasswordRequest request) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        boolean isOwner = user.getRoles().stream()
                .anyMatch(r -> r.getName() == RoleName.OWNER);
        if (isOwner) {
            throw new PasswordChangeNotAllowedException(
                    "Los propietarios deben contactar a un super-admin para cambiar su contraseña.");
        }

        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("La contraseña actual es incorrecta");
        }

        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }
}
