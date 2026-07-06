package rd.dalventa.api.superadmin.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.auth.service.JwtService;

import java.security.SecureRandom;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.superadmin.domain.AdminAction;
import rd.dalventa.api.superadmin.dto.*;
import rd.dalventa.api.superadmin.repository.AdminActionRepository;
import rd.dalventa.api.tenant.domain.TenantStatus;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuperAdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AdminActionRepository auditRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    private static final SecureRandom RANDOM = new SecureRandom();
    // Unambiguous alphabet (no 0/O/1/l/I) for readable temporary passwords.
    private static final String TEMP_PASSWORD_ALPHABET =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int TEMP_PASSWORD_LENGTH = 12;

    // ── Global stats ──────────────────────────────────────────────────────────

    public GlobalStatsResponse globalStats() {
        return new GlobalStatsResponse(
                tenantRepository.count(),
                tenantRepository.countByStatus(TenantStatus.PENDING),
                tenantRepository.countByStatus(TenantStatus.TRIAL),
                tenantRepository.countByStatus(TenantStatus.ACTIVE),
                tenantRepository.countByStatus(TenantStatus.SUSPENDED),
                tenantRepository.countByStatus(TenantStatus.CANCELLED),
                userRepository.countByTenantIdIsNotNull(),
                customerRepository.count()
        );
    }

    public List<ExpiringTenantResponse> expiringTrials() {
        var now = Instant.now();
        var in7days = now.plus(7, ChronoUnit.DAYS);
        return tenantRepository
                .findByTrialEndsAtBetweenOrderByTrialEndsAtAsc(now, in7days)
                .stream()
                .map(ExpiringTenantResponse::from)
                .toList();
    }

    public List<TenantSummaryResponse> recentTenants() {
        return tenantRepository.findTop5ByOrderByCreatedAtDesc()
                .stream()
                .map(t -> TenantSummaryResponse.of(t,
                        userRepository.countByTenantId(t.getId()),
                        customerRepository.countByTenantIdAndActiveTrue(t.getId())))
                .toList();
    }

    // ── Tenant list ───────────────────────────────────────────────────────────

    public Page<TenantSummaryResponse> listTenants(TenantStatus status, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        var tenants = status != null
                ? tenantRepository.findByStatus(status, pageable)
                : tenantRepository.findAll(pageable);
        return tenants.map(t -> TenantSummaryResponse.of(t,
                userRepository.countByTenantId(t.getId()),
                customerRepository.countByTenantIdAndActiveTrue(t.getId())));
    }

    // ── Tenant detail ─────────────────────────────────────────────────────────

    public TenantDetailResponse getTenantDetail(UUID id) {
        var tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        // All staff login users of the taller (everyone except portal CLIENT users),
        // so a super-admin can reach any of them (e.g. to reset a password).
        var owners = userRepository.findByTenantId(id).stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName() != RoleName.CLIENT))
                .map(UserSummaryResponse::from)
                .toList();
        return TenantDetailResponse.of(tenant,
                userRepository.countByTenantId(id),
                customerRepository.countByTenantIdAndActiveTrue(id),
                owners);
    }

    // ── Tenant actions ────────────────────────────────────────────────────────

    @Transactional
    public TenantSummaryResponse approveTenant(UUID id, String actor) {
        var tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        if (tenant.getStatus() != TenantStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Taller no está pendiente");
        }
        tenant.setStatus(TenantStatus.TRIAL);
        tenantRepository.save(tenant);
        audit(actor, "APPROVE", id, "Aprobado → TRIAL");
        return summary(tenant);
    }

    @Transactional
    public TenantSummaryResponse updateStatus(UUID id, UpdateTenantStatusRequest req, String actor) {
        var tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        var prev = tenant.getStatus();
        tenant.setStatus(req.status());
        tenantRepository.save(tenant);
        audit(actor, "STATUS_CHANGE", id, prev + " → " + req.status());
        return summary(tenant);
    }

    @Transactional
    public TenantSummaryResponse updatePlan(UUID id, UpdateTenantPlanRequest req, String actor) {
        var tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        var prev = tenant.getPlan();
        tenant.setPlan(req.plan());
        tenantRepository.save(tenant);
        audit(actor, "PLAN_CHANGE", id, prev + " → " + req.plan());
        return summary(tenant);
    }

    @Transactional
    public TenantSummaryResponse extendTrial(UUID id, int days, String actor) {
        var tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        var newEnd = (tenant.getTrialEndsAt() != null ? tenant.getTrialEndsAt() : Instant.now())
                .plus(days, ChronoUnit.DAYS);
        tenant.setTrialEndsAt(newEnd);
        tenantRepository.save(tenant);
        audit(actor, "EXTEND_TRIAL", id, "+" + days + " días → " + newEnd);
        return summary(tenant);
    }

    // ── Impersonation ─────────────────────────────────────────────────────────

    @Transactional
    public ImpersonateResponse impersonate(UUID tenantId, String superAdminEmail) {
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Taller no encontrado"));
        // Log in as the tenant's actual ADMIN user rather than minting a token whose
        // claims don't match the authenticated principal's real role/tenant — the
        // JWT filter authenticates by re-loading the user behind the token's email,
        // so a synthetic "impersonation" token for the super-admin's own account
        // resolved zero permissions (superadmin has no tenant role rows) and 403'd.
        var adminUser = userRepository.findByTenantId(tenantId).stream()
                .filter(u -> u.getPrimaryRole() == RoleName.ADMIN)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Este taller no tiene un administrador"));
        audit(superAdminEmail, "IMPERSONATE", tenantId, "Sesión iniciada como " + tenant.getName());
        return new ImpersonateResponse(jwtService.generateToken(adminUser), tenant.getName());
    }

    // ── User search ───────────────────────────────────────────────────────────

    public Page<UserSummaryResponse> searchUsers(String email, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "email"));
        return userRepository
                .findByEmailContainingIgnoreCaseAndTenantIdIsNotNull(email, pageable)
                .map(UserSummaryResponse::from);
    }

    // ── Audit log ─────────────────────────────────────────────────────────────

    public Page<AdminActionResponse> auditLog(UUID tenantId, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var results = tenantId != null
                ? auditRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                : auditRepository.findAllByOrderByCreatedAtDesc(pageable);
        return results.map(AdminActionResponse::from);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    // ── Password reset ──────────────────────────────────────────────────────────

    @Transactional
    public ResetPasswordResponse resetUserPassword(UUID userId, String actorEmail) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Usuario no encontrado"));
        String temp = generateTempPassword();
        user.setPassword(passwordEncoder.encode(temp));
        userRepository.save(user);
        audit(actorEmail, "PASSWORD_RESET", user.getTenantId(),
                "Contraseña temporal generada para " + user.getEmail());
        return new ResetPasswordResponse(temp);
    }

    private static String generateTempPassword() {
        var sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (int i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
            sb.append(TEMP_PASSWORD_ALPHABET.charAt(RANDOM.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return sb.toString();
    }

    private void audit(String actor, String action, UUID tenantId, String detail) {
        auditRepository.save(new AdminAction(actor, action, tenantId, detail));
    }

    private TenantSummaryResponse summary(rd.dalventa.api.tenant.domain.Tenant t) {
        return TenantSummaryResponse.of(t,
                userRepository.countByTenantId(t.getId()),
                customerRepository.countByTenantIdAndActiveTrue(t.getId()));
    }
}
