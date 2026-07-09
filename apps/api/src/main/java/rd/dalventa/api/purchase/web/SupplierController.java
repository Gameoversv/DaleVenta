package rd.dalventa.api.purchase.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.purchase.dto.SupplierRequest;
import rd.dalventa.api.purchase.dto.SupplierResponse;
import rd.dalventa.api.purchase.service.SupplierService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @GetMapping
    @PreAuthorize("@permissionService.has('SUPPLIER_VIEW') or @permissionService.has('PURCHASE_VIEW')")
    public ApiResponse<List<SupplierResponse>> list(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ApiResponse.ok(supplierService.list(q, includeInactive));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SUPPLIER_MANAGE')")
    public ApiResponse<SupplierResponse> create(@Valid @RequestBody SupplierRequest req) {
        return ApiResponse.ok(supplierService.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('SUPPLIER_MANAGE')")
    public ApiResponse<SupplierResponse> update(@PathVariable UUID id, @Valid @RequestBody SupplierRequest req) {
        return ApiResponse.ok(supplierService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("@permissionService.has('SUPPLIER_MANAGE')")
    public void deactivate(@PathVariable UUID id) {
        supplierService.deactivate(id);
    }
}
