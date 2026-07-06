package rd.dalventa.api.sale.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.sale.dto.CreateSaleRequest;
import rd.dalventa.api.sale.dto.SaleResponse;
import rd.dalventa.api.sale.dto.VoidSaleRequest;
import rd.dalventa.api.sale.service.SaleService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

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

    @GetMapping
    @PreAuthorize("@permissionService.has('SALE_VIEW_HISTORY') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<List<SaleResponse>> list(
            @RequestParam(required = false) UUID registerId,
            @RequestParam(required = false) UUID customerId) {
        if (customerId != null) {
            return ApiResponse.ok(saleService.listByCustomer(customerId));
        }
        if (registerId == null) {
            throw new IllegalArgumentException("Debe indicar registerId o customerId");
        }
        return ApiResponse.ok(saleService.list(registerId));
    }

    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.has('SALE_VIEW_HISTORY') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<SaleResponse> detail(@PathVariable UUID id) {
        return ApiResponse.ok(saleService.getDetail(id));
    }

    @PostMapping("/{id}/void")
    @PreAuthorize("@permissionService.has('SALE_VOID')")
    public ApiResponse<SaleResponse> voidSale(
            @PathVariable UUID id,
            @Valid @RequestBody VoidSaleRequest req) {
        return ApiResponse.ok(saleService.voidSale(id, req));
    }
}
