package rd.dalventa.api.credit.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.credit.dto.CreditAccountResponse;
import rd.dalventa.api.credit.dto.CreditProfileResponse;
import rd.dalventa.api.credit.dto.UpdateCreditProfileRequest;
import rd.dalventa.api.credit.service.CreditService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.UUID;

@RestController
@RequestMapping("/api/customers/{customerId}")
@RequiredArgsConstructor
public class CreditController {

    private final CreditService creditService;

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
}
