package rd.dalventa.api.product.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.dto.CreateProductRequest;
import rd.dalventa.api.product.dto.ProductResponse;
import rd.dalventa.api.product.dto.UpdateProductRequest;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final PermissionResolutionService permissionResolutionService;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;

    @Transactional
    public ProductResponse create(CreateProductRequest req) {
        var tenantId = TenantContext.require();
        if (productRepository.existsByTenantIdAndInternalCode(tenantId, req.internalCode())) {
            throw new DuplicateResourceException("Ya existe un producto con ese codigo interno");
        }
        if (req.barcode() != null && productRepository.existsByTenantIdAndBarcode(tenantId, req.barcode())) {
            throw new DuplicateResourceException("Ya existe un producto con ese codigo de barras");
        }

        var product = new Product(req.categoryId(), req.internalCode(), req.barcode(), req.description(),
                req.unit(), req.cost(), req.salePrice(), req.wholesalePrice(), req.taxRate(), req.tracksInventory());
        product.setTenantId(tenantId);
        return toResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> list(Boolean active, boolean includeInactive) {
        var tenantId = TenantContext.require();
        var products = includeInactive
                ? productRepository.findAllByTenantId(tenantId)
                : active != null
                    ? productRepository.findAllByTenantIdAndActive(tenantId, active)
                    : productRepository.findAllByTenantIdAndActiveTrue(tenantId);
        return products
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest req) {
        var tenantId = TenantContext.require();
        var product = productRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
        var previousActive = product.isActive();
        var previousCost = product.getCost();
        var previousSalePrice = product.getSalePrice();
        var previousWholesalePrice = product.getWholesalePrice();

        product.setCategoryId(req.categoryId());
        product.setDescription(req.description());
        product.setUnit(req.unit());
        product.setCost(req.cost());
        product.setSalePrice(req.salePrice());
        product.setWholesalePrice(req.wholesalePrice());
        product.setTaxRate(req.taxRate());
        product.setTracksInventory(req.tracksInventory());
        product.setActive(req.active());
        product = productRepository.save(product);
        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        if (previousActive != product.isActive()) {
            auditLogService.record(AuditAction.PRODUCT_STATUS_CHANGE, "PRODUCT", product.getId(), actorId,
                    product.getDescription() + " -> " + (product.isActive() ? "Activo" : "Inactivo"));
        }
        if (previousCost.compareTo(product.getCost()) != 0
                || previousSalePrice.compareTo(product.getSalePrice()) != 0
                || previousWholesalePrice.compareTo(product.getWholesalePrice()) != 0) {
            auditLogService.record(AuditAction.PRODUCT_PRICE_CHANGE, "PRODUCT", product.getId(), actorId,
                    "Precios actualizados para " + product.getDescription());
        }
        return toResponse(product);
    }

    private ProductResponse toResponse(Product product) {
        var user = currentUserProvider.current();
        boolean showCost = user.isPresent() && permissionResolutionService.has(user.get(), PermissionCode.COST_VIEW);
        boolean showPrice = user.isPresent() && permissionResolutionService.has(user.get(), PermissionCode.PRICE_VIEW);
        return ProductResponse.from(product, showCost, showPrice);
    }
}
