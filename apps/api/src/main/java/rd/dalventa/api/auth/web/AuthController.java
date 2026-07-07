package rd.dalventa.api.auth.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.auth.dto.AuthResponse;
import rd.dalventa.api.auth.dto.LoginRequest;
import rd.dalventa.api.auth.dto.MeResponse;
import rd.dalventa.api.auth.dto.RegisterRequest;
import rd.dalventa.api.auth.dto.TenantFeaturesResponse;
import rd.dalventa.api.auth.dto.UserResponse;
import rd.dalventa.api.auth.service.AuthService;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.shared.ratelimit.ClientIpResolver;
import rd.dalventa.api.shared.ratelimit.RateLimiterService;
import rd.dalventa.api.shared.ratelimit.RateLimitProperties;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.RateLimitExceededException;
import rd.dalventa.api.tenant.repository.TenantRepository;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties rateLimitProperties;
    private final PermissionResolutionService permissionResolutionService;
    private final CurrentUserProvider currentUserProvider;
    private final TenantRepository tenantRepository;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        enforceRateLimit("register", request.email(), httpRequest, rateLimitProperties.getRegister());
        return ResponseEntity.ok(ApiResponse.ok(authService.register(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        enforceRateLimit("login", request.email(), httpRequest, rateLimitProperties.getLogin());
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<MeResponse>> me() {
        var user = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"));
        var permissions = permissionResolutionService.resolveAll(user).stream().toList();
        var tenantFeatures = user.getTenantId() == null
                ? TenantFeaturesResponse.disabled()
                : tenantRepository.findById(user.getTenantId())
                        .map(TenantFeaturesResponse::from)
                        .orElseGet(TenantFeaturesResponse::disabled);
        return ResponseEntity.ok(ApiResponse.ok(new MeResponse(UserResponse.from(user), permissions, tenantFeatures)));
    }

    private void enforceRateLimit(
            String action, String account, HttpServletRequest httpRequest, RateLimitProperties.Limit limit) {
        if (!rateLimitProperties.isEnabled()) {
            return;
        }
        String ip = ClientIpResolver.resolve(httpRequest);
        String key = action + ":" + ip + ":" + (account == null ? "" : account.toLowerCase());
        if (!rateLimiterService.tryConsume(key, limit)) {
            throw new RateLimitExceededException(
                    "Demasiados intentos de " + action + " desde " + ip);
        }
    }
}
