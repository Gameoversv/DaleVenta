package rd.dalventa.api.product.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.product.dto.CategoryResponse;
import rd.dalventa.api.product.dto.CreateCategoryRequest;
import rd.dalventa.api.product.service.CategoryService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('INVENTORY_CREATE')")
    public ApiResponse<CategoryResponse> create(@Valid @RequestBody CreateCategoryRequest req) {
        return ApiResponse.ok(categoryService.create(req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<CategoryResponse>> list() {
        return ApiResponse.ok(categoryService.list());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.has('INVENTORY_EDIT')")
    public ApiResponse<Void> delete(@PathVariable UUID id) {
        categoryService.delete(id);
        return ApiResponse.ok(null);
    }
}
