package rd.dalventa.api.superadmin.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.superadmin.dto.*;
import rd.dalventa.api.superadmin.service.SuperAdminService;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/super-admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class SuperAdminController {

    private final SuperAdminService service;

    @GetMapping("/stats")
    public ApiResponse<GlobalStatsResponse> stats() {
        return ApiResponse.ok(service.globalStats());
    }

    @GetMapping("/stats/expiring-trials")
    public ApiResponse<List<ExpiringTenantResponse>> expiringTrials() {
        return ApiResponse.ok(service.expiringTrials());
    }

    @GetMapping("/stats/recent-tenants")
    public ApiResponse<List<TenantSummaryResponse>> recentTenants() {
        return ApiResponse.ok(service.recentTenants());
    }

    @GetMapping("/tenants")
    public ApiResponse<Page<TenantSummaryResponse>> tenants(
            @RequestParam(required = false) TenantStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(service.listTenants(status, page, size));
    }

    @GetMapping("/tenants/{id}")
    public ApiResponse<TenantDetailResponse> tenantDetail(@PathVariable UUID id) {
        return ApiResponse.ok(service.getTenantDetail(id));
    }

    @PostMapping("/tenants/{id}/approve")
    public ApiResponse<TenantSummaryResponse> approve(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.approveTenant(id, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/status")
    public ApiResponse<TenantSummaryResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantStatusRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updateStatus(id, req, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/plan")
    public ApiResponse<TenantSummaryResponse> updatePlan(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantPlanRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updatePlan(id, req, principal.getUsername()));
    }

    @PostMapping("/tenants/{id}/extend-trial")
    public ApiResponse<TenantSummaryResponse> extendTrial(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "30") int days,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.extendTrial(id, days, principal.getUsername()));
    }

    @PostMapping("/tenants/{id}/impersonate")
    public ApiResponse<ImpersonateResponse> impersonate(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.impersonate(id, principal.getUsername()));
    }

    @GetMapping("/users")
    public ApiResponse<Page<UserSummaryResponse>> searchUsers(
            @RequestParam(required = false, defaultValue = "") String email,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.ok(service.searchUsers(email, page, size));
    }

    @PostMapping("/users/{userId}/reset-password")
    public ApiResponse<ResetPasswordResponse> resetPassword(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.resetUserPassword(userId, principal.getUsername()));
    }

    @GetMapping("/audit")
    public ApiResponse<Page<AdminActionResponse>> auditLog(
            @RequestParam(required = false) UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        return ApiResponse.ok(service.auditLog(tenantId, page, size));
    }
}
