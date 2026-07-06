package rd.dalventa.api.credit.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.credit.dto.AccountsReceivableRow;
import rd.dalventa.api.credit.service.CreditService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/credit/accounts-receivable")
@RequiredArgsConstructor
public class AccountsReceivableController {

    private final CreditService creditService;

    @GetMapping
    @PreAuthorize("@permissionService.has('REPORTS_VIEW')")
    public ApiResponse<List<AccountsReceivableRow>> list() {
        return ApiResponse.ok(creditService.listReceivables());
    }
}
