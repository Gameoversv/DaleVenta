package rd.dalventa.api.sale.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.sale.dto.CreateSaleRequest;
import rd.dalventa.api.sale.dto.SaleResponse;
import rd.dalventa.api.sale.service.SaleService;
import rd.dalventa.api.shared.web.ApiResponse;

@RestController
@RequestMapping("/api/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SALE_CREATE')")
    public ApiResponse<SaleResponse> create(@Valid @RequestBody CreateSaleRequest req) {
        return ApiResponse.ok(saleService.create(req));
    }
}
