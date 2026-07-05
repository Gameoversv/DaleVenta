package rd.dalventa.api.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.inventory.domain.Product;
import rd.dalventa.api.inventory.domain.ProductCategory;
import rd.dalventa.api.inventory.dto.CreateProductRequest;
import rd.dalventa.api.inventory.dto.ProductResponse;
import rd.dalventa.api.inventory.dto.UpdateProductRequest;
import rd.dalventa.api.inventory.repository.ProductRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final ProductRepository repository;

    @Transactional(readOnly = true)
    public ApiResponse<List<ProductResponse>> search(ProductCategory category, boolean lowStock, int page, int size) {
        UUID tenantId = TenantContext.require();
        Page<Product> result = repository.search(
                tenantId, category, lowStock,
                PageRequest.of(page, size, Sort.by("internalCode").ascending())
        );
        List<ProductResponse> data = result.getContent().stream().map(ProductResponse::from).toList();
        return ApiResponse.paged(data, result.getTotalElements(), page, size);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> findLowStock() {
        return repository.findLowStock(TenantContext.require()).stream().map(ProductResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse findById(UUID id) {
        return repository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .map(ProductResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + id));
    }

    @Transactional
    public ProductResponse create(CreateProductRequest req) {
        UUID tenantId = TenantContext.require();
        if (repository.existsByInternalCodeAndTenantIdAndActiveTrue(req.internalCode(), tenantId)) {
            throw new IllegalArgumentException("Ya existe un producto con el código: " + req.internalCode());
        }

        var product = new Product();
        product.setTenantId(tenantId);
        product.setInternalCode(req.internalCode());
        product.setDescription(req.description());
        product.setPurchaseCost(req.purchaseCost());
        product.setSalePrice(req.salePrice());
        product.setCurrentStock(req.currentStock());
        product.setMinStock(req.minStock());
        product.setCategory(req.category());

        return ProductResponse.from(repository.save(product));
    }

    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest req) {
        UUID tenantId = TenantContext.require();
        var product = repository.findByIdAndTenantIdAndActiveTrue(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + id));

        if (req.internalCode() != null && !req.internalCode().equals(product.getInternalCode())
                && repository.existsByInternalCodeAndTenantIdAndActiveTrue(req.internalCode(), tenantId)) {
            throw new IllegalArgumentException("Ya existe un producto con el código: " + req.internalCode());
        }

        if (req.internalCode() != null) product.setInternalCode(req.internalCode());
        if (req.description() != null) product.setDescription(req.description());
        if (req.purchaseCost() != null) product.setPurchaseCost(req.purchaseCost());
        if (req.salePrice() != null) product.setSalePrice(req.salePrice());
        if (req.currentStock() != null) product.setCurrentStock(req.currentStock());
        if (req.minStock() != null) product.setMinStock(req.minStock());
        if (req.category() != null) product.setCategory(req.category());

        return ProductResponse.from(repository.save(product));
    }

    @Transactional
    public void delete(UUID id) {
        var product = repository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + id));
        product.setActive(false);
        repository.save(product);
    }
}
