package rd.dalventa.api.fiscal.web;

import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.auth.dto.TenantFeaturesResponse;
import rd.dalventa.api.fiscal.dto.FiscalProfileRequest;
import rd.dalventa.api.fiscal.dto.FiscalProfileResponse;
import rd.dalventa.api.fiscal.dto.FiscalReceiptSequenceRequest;
import rd.dalventa.api.fiscal.dto.FiscalReceiptSequenceResponse;
import rd.dalventa.api.fiscal.service.FiscalService;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/fiscal")
@RequiredArgsConstructor
public class FiscalController {

    private final TenantRepository tenantRepository;
    private final FiscalService fiscalService;

    @GetMapping("/status")
    @PreAuthorize("hasRole('ADMIN') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<TenantFeaturesResponse> status() {
        var tenant = tenantRepository.findById(TenantContext.require())
                .orElseThrow(() -> new IllegalStateException("Tenant no encontrado"));
        return ApiResponse.ok(TenantFeaturesResponse.from(tenant));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FiscalProfileResponse> profile() {
        return ApiResponse.ok(fiscalService.getProfile());
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FiscalProfileResponse> updateProfile(@Valid @RequestBody FiscalProfileRequest req) {
        return ApiResponse.ok(fiscalService.updateProfile(req));
    }

    @GetMapping("/sequences")
    @PreAuthorize("hasRole('ADMIN') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<List<FiscalReceiptSequenceResponse>> sequences() {
        return ApiResponse.ok(fiscalService.listSequences());
    }

    @PostMapping("/sequences")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FiscalReceiptSequenceResponse> createSequence(@Valid @RequestBody FiscalReceiptSequenceRequest req) {
        return ApiResponse.ok(fiscalService.createSequence(req));
    }

    @PutMapping("/sequences/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<FiscalReceiptSequenceResponse> updateSequence(
            @PathVariable UUID id,
            @Valid @RequestBody FiscalReceiptSequenceRequest req
    ) {
        return ApiResponse.ok(fiscalService.updateSequence(id, req));
    }
}
