package rd.dalventa.api.purchase.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.purchase.dto.CreatePurchaseRequest;
import rd.dalventa.api.purchase.dto.AccountsPayableRow;
import rd.dalventa.api.purchase.dto.PurchasePaymentResponse;
import rd.dalventa.api.purchase.dto.PurchaseResponse;
import rd.dalventa.api.purchase.dto.RecordPurchasePaymentRequest;
import rd.dalventa.api.purchase.service.PurchaseService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService purchaseService;

    @GetMapping
    @PreAuthorize("@permissionService.has('PURCHASE_VIEW')")
    public ApiResponse<List<PurchaseResponse>> list() {
        return ApiResponse.ok(purchaseService.list());
    }

    @GetMapping("/accounts-payable")
    @PreAuthorize("@permissionService.has('PURCHASE_PAYABLE_VIEW')")
    public ApiResponse<List<AccountsPayableRow>> accountsPayable() {
        return ApiResponse.ok(purchaseService.accountsPayable());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has('PURCHASE_VIEW')")
    public ApiResponse<PurchaseResponse> detail(@PathVariable UUID id) {
        return ApiResponse.ok(purchaseService.detail(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('PURCHASE_CREATE')")
    public ApiResponse<PurchaseResponse> create(@Valid @RequestBody CreatePurchaseRequest req) {
        return ApiResponse.ok(purchaseService.create(req));
    }

    @PatchMapping("/{id}/receive")
    @PreAuthorize("@permissionService.has('PURCHASE_RECEIVE')")
    public ApiResponse<PurchaseResponse> receive(@PathVariable UUID id) {
        return ApiResponse.ok(purchaseService.receive(id));
    }

    @GetMapping("/{id}/payments")
    @PreAuthorize("@permissionService.has('PURCHASE_PAYABLE_VIEW')")
    public ApiResponse<List<PurchasePaymentResponse>> payments(@PathVariable UUID id) {
        return ApiResponse.ok(purchaseService.payments(id));
    }

    @PostMapping("/{id}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('PURCHASE_PAYMENT_RECORD')")
    public ApiResponse<PurchaseResponse> recordPayment(
            @PathVariable UUID id,
            @Valid @RequestBody RecordPurchasePaymentRequest req
    ) {
        return ApiResponse.ok(purchaseService.recordPayment(id, req));
    }
}
