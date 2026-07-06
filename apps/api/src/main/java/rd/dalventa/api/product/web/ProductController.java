package rd.dalventa.api.product.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.product.dto.CreateProductRequest;
import rd.dalventa.api.product.dto.ProductResponse;
import rd.dalventa.api.product.dto.UpdateProductRequest;
import rd.dalventa.api.product.service.ProductService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('INVENTORY_CREATE')")
    public ApiResponse<ProductResponse> create(@Valid @RequestBody CreateProductRequest req) {
        return ApiResponse.ok(productService.create(req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<ProductResponse>> list(
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "false") boolean includeInactive) {
        return ApiResponse.ok(productService.list(active, includeInactive));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('INVENTORY_EDIT')")
    public ApiResponse<ProductResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateProductRequest req) {
        return ApiResponse.ok(productService.update(id, req));
    }
}
