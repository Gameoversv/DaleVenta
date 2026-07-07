package rd.dalventa.api.fiscal.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.auth.dto.TenantFeaturesResponse;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.tenant.repository.TenantRepository;

@RestController
@RequestMapping("/api/fiscal")
@RequiredArgsConstructor
public class FiscalController {

    private final TenantRepository tenantRepository;

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TenantFeaturesResponse> status() {
        var tenant = tenantRepository.findById(TenantContext.require())
                .orElseThrow(() -> new IllegalStateException("Tenant no encontrado"));
        return ApiResponse.ok(TenantFeaturesResponse.from(tenant));
    }
}
