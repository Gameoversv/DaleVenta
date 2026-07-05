package rd.dalventa.api.purchase.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.inventory.domain.Product;
import rd.dalventa.api.inventory.repository.ProductRepository;
import rd.dalventa.api.purchase.domain.Purchase;
import rd.dalventa.api.purchase.domain.PurchaseItem;
import rd.dalventa.api.purchase.domain.Supplier;
import rd.dalventa.api.purchase.dto.CreatePurchaseRequest;
import rd.dalventa.api.purchase.dto.PurchaseResponse;
import rd.dalventa.api.purchase.dto.SupplierRequest;
import rd.dalventa.api.purchase.dto.SupplierResponse;
import rd.dalventa.api.purchase.repository.PurchaseRepository;
import rd.dalventa.api.purchase.repository.SupplierRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    // --- Suppliers ---

    @Transactional(readOnly = true)
    public List<SupplierResponse> listSuppliers() {
        return supplierRepository.findByTenantIdAndActiveTrueOrderByNameAsc(TenantContext.require())
                .stream().map(SupplierResponse::from).toList();
    }

    @Transactional
    public SupplierResponse createSupplier(SupplierRequest req) {
        UUID tenantId = TenantContext.require();
        var supplier = new Supplier();
        supplier.setTenantId(tenantId);
        supplier.setName(req.name());
        supplier.setPhone(req.phone());
        supplier.setEmail(req.email());
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public void deleteSupplier(UUID id) {
        var supplier = supplierRepository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado: " + id));
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }

    // --- Purchases ---

    @Transactional(readOnly = true)
    public ApiResponse<List<PurchaseResponse>> list(int page, int size) {
        UUID tenantId = TenantContext.require();
        var result = purchaseRepository.findAllWithSupplier(tenantId, PageRequest.of(page, size));
        var data = result.getContent().stream().map(PurchaseResponse::from).toList();
        return ApiResponse.paged(data, result.getTotalElements(), page, size);
    }

    @Transactional(readOnly = true)
    public PurchaseResponse findById(UUID id) {
        return purchaseRepository.findByIdWithDetails(id, TenantContext.require())
                .map(PurchaseResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Compra no encontrada: " + id));
    }

    @Transactional
    public PurchaseResponse create(CreatePurchaseRequest req) {
        UUID tenantId = TenantContext.require();
        var supplier = supplierRepository.findByIdAndTenantIdAndActiveTrue(req.supplierId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado: " + req.supplierId()));

        var purchase = new Purchase();
        purchase.setTenantId(tenantId);
        purchase.setSupplier(supplier);
        purchase.setPurchaseDate(req.purchaseDate());
        purchase.setNotes(req.notes());

        BigDecimal total = BigDecimal.ZERO;

        for (var itemReq : req.items()) {
            Product product = productRepository.findByIdAndTenantIdAndActiveTrue(itemReq.productId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado: " + itemReq.productId()));

            var item = new PurchaseItem();
            item.setPurchase(purchase);
            item.setProduct(product);
            item.setQuantity(itemReq.quantity());
            item.setUnitCost(itemReq.unitCost());

            BigDecimal subtotal = itemReq.unitCost().multiply(BigDecimal.valueOf(itemReq.quantity()));
            item.setSubtotal(subtotal);
            total = total.add(subtotal);

            purchase.getItems().add(item);

            product.setCurrentStock(product.getCurrentStock() + itemReq.quantity());
            productRepository.save(product);
        }

        purchase.setTotal(total);
        return PurchaseResponse.from(purchaseRepository.save(purchase));
    }
}
