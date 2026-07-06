package rd.dalventa.api.credit.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.credit.dto.CreditAccountResponse;
import rd.dalventa.api.credit.dto.CreditProfileResponse;
import rd.dalventa.api.credit.dto.CreditTransactionResponse;
import rd.dalventa.api.credit.dto.RecordCreditPaymentRequest;
import rd.dalventa.api.credit.dto.UpdateCreditProfileRequest;
import rd.dalventa.api.credit.service.CreditService;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers/{customerId}")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping("/credit-profile")
    @PreAuthorize("@permissionService.has('CUSTOMER_EDIT')")
    public ApiResponse<CreditProfileResponse> getProfile(@PathVariable UUID customerId) {
        return ApiResponse.ok(creditService.getProfile(customerId));
    }

    @PutMapping("/credit-profile")
    @PreAuthorize("@permissionService.has('CREDIT_AUTHORIZE')")
    public ApiResponse<CreditProfileResponse> updateProfile(
            @PathVariable UUID customerId,
            @Valid @RequestBody UpdateCreditProfileRequest req) {
        return ApiResponse.ok(creditService.updateProfile(customerId, req));
    }

    @GetMapping("/credit-account")
    @PreAuthorize("@permissionService.has('CUSTOMER_EDIT')")
    public ApiResponse<CreditAccountResponse> getAccount(@PathVariable UUID customerId) {
        return ApiResponse.ok(creditService.getAccount(customerId));
    }

    @PostMapping("/credit-payments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CREDIT_RECEIVE_PAYMENT')")
    public ApiResponse<CreditAccountResponse> recordPayment(
            @PathVariable UUID customerId,
            @Valid @RequestBody RecordCreditPaymentRequest req) {
        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        return ApiResponse.ok(creditService.recordPayment(customerId, req, userId));
    }

    @GetMapping("/credit-transactions")
    @PreAuthorize("@permissionService.has('CUSTOMER_EDIT')")
    public ApiResponse<List<CreditTransactionResponse>> listTransactions(@PathVariable UUID customerId) {
        return ApiResponse.ok(creditService.listTransactions(customerId));
    }
}
