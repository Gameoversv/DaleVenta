package rd.dalventa.api.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.dto.CreateUserRequest;
import rd.dalventa.api.auth.dto.ResetUserPasswordResponse;
import rd.dalventa.api.auth.dto.UpdateUserRequest;
import rd.dalventa.api.auth.dto.UserResponse;
import rd.dalventa.api.auth.repository.RoleRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String TEMP_PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 12;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final CurrentUserProvider currentUserProvider;

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        var tenantId = TenantContext.require();
        return userRepository.findByTenantId(tenantId)
                .stream()
                .filter(user -> user.getPrimaryRole() != RoleName.CLIENT)
                .map(UserResponse::from)
                .toList();
    }

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        var tenantId = TenantContext.require();
        validateStaffRole(request.role());
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("El correo ya esta registrado");
        }

        var role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new IllegalStateException("Rol no encontrado: " + request.role()));
        var user = new User(request.name(), request.email(), passwordEncoder.encode(request.password()), tenantId);
        user.addRole(role);
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest request) {
        validateStaffRole(request.role());
        var user = findTenantUser(id);
        userRepository.findByEmail(request.email())
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("El correo ya esta registrado");
                });
        var role = roleRepository.findByName(request.role())
                .orElseThrow(() -> new IllegalStateException("Rol no encontrado: " + request.role()));
        user.updateProfile(request.name(), request.email());
        user.replaceRole(role);
        user.setActive(request.active());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public ResetUserPasswordResponse resetPassword(UUID id) {
        var user = findTenantUser(id);
        var temp = generateTempPassword();
        user.setPassword(passwordEncoder.encode(temp));
        userRepository.save(user);
        return new ResetUserPasswordResponse(temp);
    }

    @Transactional
    public void setPassword(UUID id, String newPassword) {
        var user = findTenantUser(id);
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        auditLogService.recordEvent(AuditAction.USER_PASSWORD_SET, "USER", id, actorId, null);
    }

    public User getTenantStaffUser(UUID id) {
        return findTenantUser(id);
    }

    private User findTenantUser(UUID id) {
        var tenantId = TenantContext.require();
        var user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (!tenantId.equals(user.getTenantId()) || user.getPrimaryRole() == RoleName.CLIENT) {
            throw new ResourceNotFoundException("Usuario no encontrado");
        }
        return user;
    }

    private static void validateStaffRole(RoleName role) {
        if (role == RoleName.SUPER_ADMIN || role == RoleName.CLIENT) {
            throw new IllegalArgumentException("Rol no permitido para usuarios internos");
        }
    }

    private static String generateTempPassword() {
        var sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(RANDOM.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }
}
