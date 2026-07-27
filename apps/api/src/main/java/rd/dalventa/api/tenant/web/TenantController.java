package rd.dalventa.api.tenant.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.auth.dto.AuthResponse;
import rd.dalventa.api.shared.ratelimit.ClientIpResolver;
import rd.dalventa.api.shared.ratelimit.RateLimitProperties;
import rd.dalventa.api.shared.ratelimit.RateLimiterService;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.HoneypotGuard;
import rd.dalventa.api.shared.web.RateLimitExceededException;
import rd.dalventa.api.tenant.dto.RegisterTenantRequest;
import rd.dalventa.api.tenant.dto.TenantPublicResult;
import rd.dalventa.api.tenant.service.TenantService;

import java.util.List;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties rateLimitProperties;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterTenantRequest req, HttpServletRequest httpRequest) {
        HoneypotGuard.check(req.website());
        if (rateLimitProperties.isEnabled()) {
            String ip = ClientIpResolver.resolve(httpRequest);
            String key = "tenant-register:" + ip + ":" + req.adminEmail().toLowerCase();
            if (!rateLimiterService.tryConsume(key, rateLimitProperties.getRegister())) {
                throw new RateLimitExceededException("Demasiados intentos de registro desde " + ip);
            }
        }
        return ApiResponse.ok(tenantService.registerTenant(req));
    }

    @GetMapping("/public/search")
    public ApiResponse<List<TenantPublicResult>> search(
            @RequestParam(defaultValue = "") String q
    ) {
        return ApiResponse.ok(tenantService.searchPublic(q));
    }
}
