package rd.dalventa.api.inventory.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.inventory.domain.ProductCategory;
import rd.dalventa.api.inventory.dto.CreateProductRequest;
import rd.dalventa.api.inventory.dto.ProductResponse;
import rd.dalventa.api.inventory.dto.UpdateProductRequest;
import rd.dalventa.api.inventory.service.InventoryService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService service;

    @GetMapping
    public ApiResponse<List<ProductResponse>> search(
            @RequestParam(required = false) ProductCategory category,
            @RequestParam(name = "low_stock", defaultValue = "false") boolean lowStock,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return service.search(category, lowStock, page, size);
    }

    @GetMapping("/low-stock")
    public ApiResponse<List<ProductResponse>> lowStock() {
        return ApiResponse.ok(service.findLowStock());
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductResponse> findById(@PathVariable UUID id) {
        return ApiResponse.ok(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProductResponse> create(@Valid @RequestBody CreateProductRequest req) {
        return ApiResponse.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ApiResponse<ProductResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateProductRequest req
    ) {
        return ApiResponse.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
