package rd.dalventa.api.superadmin.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
    public ApiResponse<List<TenantSummaryResponse>> tenants(
            @RequestParam(required = false) TenantStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.listTenants(status, page, size);
        return ApiResponse.paged(result.getContent(), result.getTotalElements(), page, size);
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

    @PatchMapping("/tenants/{id}/fiscal-module")
    public ApiResponse<TenantDetailResponse> updateFiscalModule(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantFiscalModuleRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updateFiscalModule(id, req, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/cash-denominations")
    public ApiResponse<TenantDetailResponse> updateCashDenominations(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantCashDenominationsRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updateCashDenominations(id, req, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/multi-branch")
    public ApiResponse<TenantDetailResponse> updateMultiBranch(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantMultiBranchRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updateMultiBranch(id, req, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/multi-register")
    public ApiResponse<TenantDetailResponse> updateMultiRegister(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantMultiRegisterRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updateMultiRegister(id, req, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/rental-module")
    public ApiResponse<TenantDetailResponse> updateRentalModule(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantRentalModuleRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updateRentalModule(id, req, principal.getUsername()));
    }

    @PatchMapping("/tenants/{id}/purchase-module")
    public ApiResponse<TenantDetailResponse> updatePurchaseModule(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTenantPurchaseModuleRequest req,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.updatePurchaseModule(id, req, principal.getUsername()));
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
    public ApiResponse<List<UserSummaryResponse>> searchUsers(
            @RequestParam(required = false, defaultValue = "") String email,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var result = service.searchUsers(email, page, size);
        return ApiResponse.paged(result.getContent(), result.getTotalElements(), page, size);
    }

    @PostMapping("/users/{userId}/reset-password")
    public ApiResponse<ResetPasswordResponse> resetPassword(
            @PathVariable UUID userId,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return ApiResponse.ok(service.resetUserPassword(userId, principal.getUsername()));
    }

    @GetMapping("/audit")
    public ApiResponse<List<AdminActionResponse>> auditLog(
            @RequestParam(required = false) UUID tenantId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        var result = service.auditLog(tenantId, page, size);
        return ApiResponse.paged(result.getContent(), result.getTotalElements(), page, size);
    }
}
