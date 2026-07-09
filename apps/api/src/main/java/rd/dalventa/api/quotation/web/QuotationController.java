package rd.dalventa.api.quotation.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.quotation.dto.CreateQuotationRequest;
import rd.dalventa.api.quotation.dto.QuotationResponse;
import rd.dalventa.api.quotation.service.QuotationService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/quotations")
@RequiredArgsConstructor
public class QuotationController {

    private final QuotationService quotationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SALE_CREATE')")
    public ApiResponse<QuotationResponse> create(@Valid @RequestBody CreateQuotationRequest req) {
        return ApiResponse.ok(quotationService.create(req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('SALE_VIEW_HISTORY') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<List<QuotationResponse>> list() {
        return ApiResponse.ok(quotationService.list());
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has('SALE_VIEW_HISTORY') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<QuotationResponse> detail(@PathVariable UUID id) {
        return ApiResponse.ok(quotationService.detail(id));
    }
}
