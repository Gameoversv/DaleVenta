package rd.dalventa.api.portal.web;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.portal.dto.PortalAuthResponse;
import rd.dalventa.api.portal.dto.PortalChangePasswordRequest;
import rd.dalventa.api.portal.dto.PortalLoginRequest;
import rd.dalventa.api.portal.service.PortalAuthService;
import rd.dalventa.api.shared.domain.CustomerContext;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.ratelimit.ClientIpResolver;
import rd.dalventa.api.shared.ratelimit.RateLimitProperties;
import rd.dalventa.api.shared.ratelimit.RateLimiterService;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.HoneypotGuard;

@RestController
@RequestMapping("/api/portal/auth")
@RequiredArgsConstructor
public class PortalAuthController {

    private final PortalAuthService portalAuthService;
    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties rateLimitProperties;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<PortalAuthResponse>> login(
            @RequestBody PortalLoginRequest request, HttpServletRequest httpRequest) {
        try {
            HoneypotGuard.check(request.website());

            if (rateLimitProperties.isEnabled()) {
                String ip = ClientIpResolver.resolve(httpRequest);
                String key = "portal-login:" + ip + ":" + safeLower(request.tenantSlug()) + ":" + safeLower(request.documentId());
                if (!rateLimiterService.tryConsume(key, rateLimitProperties.getPortalLogin())) {
                    return ResponseEntity.status(429)
                            .body(ApiResponse.error("Demasiados intentos. Intenta de nuevo en unos minutos."));
                }
            }

            PortalAuthResponse response = portalAuthService.login(request);
            return ResponseEntity.ok(ApiResponse.ok(response));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(401).body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @RequestBody PortalChangePasswordRequest request
    ) {
        try {
            portalAuthService.changePassword(
                    CustomerContext.require(),
                    TenantContext.require(),
                    request.currentPassword(),
                    request.newPassword()
            );
            return ResponseEntity.ok(ApiResponse.ok(null));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(400).body(ApiResponse.error(e.getMessage()));
        }
    }

    private String safeLower(String value) {
        return value == null ? "" : value.toLowerCase();
    }
}
