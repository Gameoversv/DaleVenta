package rd.dalventa.api.purchase.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.purchase.dto.SupplierRequest;
import rd.dalventa.api.purchase.dto.SupplierResponse;
import rd.dalventa.api.purchase.service.PurchaseService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final PurchaseService service;

    @GetMapping
    public ApiResponse<List<SupplierResponse>> list() {
        return ApiResponse.ok(service.listSuppliers());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<SupplierResponse> create(@Valid @RequestBody SupplierRequest req) {
        return ApiResponse.ok(service.createSupplier(req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.deleteSupplier(id);
    }
}
