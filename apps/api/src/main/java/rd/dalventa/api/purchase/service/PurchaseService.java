package rd.dalventa.api.purchase.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.branch.domain.Branch;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.inventory.domain.BranchInventory;
import rd.dalventa.api.inventory.domain.InventoryMovement;
import rd.dalventa.api.inventory.domain.InventoryMovementType;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.inventory.repository.InventoryMovementRepository;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.purchase.domain.Purchase;
import rd.dalventa.api.purchase.domain.PurchaseItem;
import rd.dalventa.api.purchase.domain.PurchaseStatus;
import rd.dalventa.api.purchase.domain.Supplier;
import rd.dalventa.api.purchase.dto.CreatePurchaseRequest;
import rd.dalventa.api.purchase.dto.AccountsPayableRow;
import rd.dalventa.api.purchase.dto.PurchaseItemRequest;
import rd.dalventa.api.purchase.dto.PurchaseItemResponse;
import rd.dalventa.api.purchase.dto.PurchasePaymentResponse;
import rd.dalventa.api.purchase.dto.PurchaseResponse;
import rd.dalventa.api.purchase.dto.RecordPurchasePaymentRequest;
import rd.dalventa.api.purchase.domain.PurchasePayment;
import rd.dalventa.api.purchase.repository.PurchaseItemRepository;
import rd.dalventa.api.purchase.repository.PurchasePaymentRepository;
import rd.dalventa.api.purchase.repository.PurchaseRepository;
import rd.dalventa.api.purchase.repository.SupplierRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final PurchaseItemRepository purchaseItemRepository;
    private final SupplierRepository supplierRepository;
    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final BranchInventoryRepository branchInventoryRepository;
    private final InventoryMovementRepository inventoryMovementRepository;
    private final CurrentUserProvider currentUserProvider;
    private final TenantRepository tenantRepository;
    private final PurchasePaymentRepository purchasePaymentRepository;

    @Transactional(readOnly = true)
    public List<PurchaseResponse> list() {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        return purchaseRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PurchaseResponse detail(UUID id) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        var purchase = purchaseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Compra no encontrada"));
        return toResponse(purchase);
    }

    @Transactional
    public PurchaseResponse create(CreatePurchaseRequest req) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        if (req.items() == null || req.items().isEmpty()) {
            throw new IllegalArgumentException("La compra requiere al menos un producto");
        }
        supplierRepository.findByIdAndTenantIdAndActiveTrue(req.supplierId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        branchRepository.findById(req.branchId())
                .filter(branch -> branch.getTenantId().equals(tenantId) && branch.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));

        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        long sequence = purchaseRepository.countByTenantId(tenantId) + 1;

        var purchase = new Purchase();
        purchase.setTenantId(tenantId);
        purchase.setPurchaseNumber("CP-%06d".formatted(sequence));
        purchase.setSupplierId(req.supplierId());
        purchase.setBranchId(req.branchId());
        purchase.setInvoiceNumber(req.invoiceNumber());
        purchase.setPurchasedAt(req.purchasedAt() != null ? req.purchasedAt() : Instant.now());
        purchase.setNotes(req.notes());
        purchase.setCreatedByUserId(actorId);

        List<PurchaseItem> items = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO.setScale(2);
        BigDecimal taxTotal = BigDecimal.ZERO.setScale(2);
        BigDecimal discountTotal = BigDecimal.ZERO.setScale(2);

        for (PurchaseItemRequest itemReq : req.items()) {
            Product product = productRepository.findByIdAndTenantId(itemReq.productId(), tenantId)
                    .filter(Product::isActive)
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
            BigDecimal unitCost = scaled(itemReq.unitCost());
            BigDecimal taxRate = itemReq.taxRate() != null ? scaled(itemReq.taxRate()) : product.getTaxRate();
            BigDecimal discount = itemReq.discountAmount() != null ? scaled(itemReq.discountAmount()) : BigDecimal.ZERO.setScale(2);
            BigDecimal lineSubtotal = unitCost.multiply(BigDecimal.valueOf(itemReq.quantity())).setScale(2, RoundingMode.HALF_UP);
            if (discount.compareTo(lineSubtotal) > 0) {
                throw new IllegalArgumentException("El descuento no puede superar el subtotal de una linea");
            }
            BigDecimal taxable = lineSubtotal.subtract(discount);
            BigDecimal lineTax = taxable.multiply(taxRate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = taxable.add(lineTax).setScale(2, RoundingMode.HALF_UP);

            var item = new PurchaseItem();
            item.setTenantId(tenantId);
            item.setProductId(product.getId());
            item.setQuantity(itemReq.quantity());
            item.setUnitCost(unitCost);
            item.setTaxRate(taxRate);
            item.setDiscountAmount(discount);
            item.setLineTotal(lineTotal);
            items.add(item);
            subtotal = subtotal.add(lineSubtotal);
            taxTotal = taxTotal.add(lineTax);
            discountTotal = discountTotal.add(discount);
        }

        purchase.setSubtotal(subtotal);
        purchase.setTaxTotal(taxTotal);
        purchase.setDiscountTotal(discountTotal);
        purchase.setTotal(subtotal.add(taxTotal).subtract(discountTotal).setScale(2, RoundingMode.HALF_UP));
        purchase = purchaseRepository.save(purchase);
        for (PurchaseItem item : items) {
            item.setPurchaseId(purchase.getId());
            purchaseItemRepository.save(item);
        }
        return toResponse(purchase);
    }

    @Transactional
    public PurchaseResponse receive(UUID id) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        var purchase = purchaseRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Compra no encontrada"));
        if (purchase.getStatus() != PurchaseStatus.DRAFT) {
            throw new IllegalArgumentException("Solo se pueden recibir compras en borrador");
        }
        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        for (PurchaseItem item : purchaseItemRepository.findAllByPurchaseId(purchase.getId())) {
            var product = productRepository.findByIdAndTenantId(item.getProductId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
            if (!product.isTracksInventory()) {
                continue;
            }
            var branchInventory = branchInventoryRepository
                    .lockByTenantIdAndBranchIdAndProductId(tenantId, purchase.getBranchId(), item.getProductId())
                    .orElseGet(() -> createBranchInventory(tenantId, purchase.getBranchId(), item.getProductId()));
            int previousStock = branchInventory.getCurrentStock();
            int newStock = previousStock + item.getQuantity();
            branchInventory.setCurrentStock(newStock);
            branchInventoryRepository.save(branchInventory);

            var movement = new InventoryMovement(branchInventory.getId(), InventoryMovementType.ENTRY, item.getQuantity(),
                    previousStock, newStock, "Compra " + purchase.getPurchaseNumber(), actorId);
            movement.setTenantId(tenantId);
            inventoryMovementRepository.save(movement);
        }
        purchase.setStatus(PurchaseStatus.RECEIVED);
        purchase.setReceivedAt(Instant.now());
        purchase.setReceivedByUserId(actorId);
        return toResponse(purchaseRepository.save(purchase));
    }

    @Transactional(readOnly = true)
    public List<AccountsPayableRow> accountsPayable() {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        return purchaseRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .filter(purchase -> purchase.getStatus() == PurchaseStatus.RECEIVED)
                .map(purchase -> {
                    BigDecimal paid = paidAmount(tenantId, purchase.getId());
                    BigDecimal balance = purchase.getTotal().subtract(paid).setScale(2, RoundingMode.HALF_UP);
                    String supplierName = supplierRepository.findByIdAndTenantId(purchase.getSupplierId(), tenantId)
                            .map(Supplier::getName)
                            .orElse("Proveedor eliminado");
                    return AccountsPayableRow.from(purchase, supplierName, paid, balance);
                })
                .filter(row -> row.balanceDue().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(AccountsPayableRow::purchasedAt).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PurchasePaymentResponse> payments(UUID purchaseId) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        purchaseRepository.findByIdAndTenantId(purchaseId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Compra no encontrada"));
        return purchasePaymentRepository.findAllByTenantIdAndPurchaseIdOrderByPaidAtDesc(tenantId, purchaseId)
                .stream()
                .map(PurchasePaymentResponse::from)
                .toList();
    }

    @Transactional
    public PurchaseResponse recordPayment(UUID purchaseId, RecordPurchasePaymentRequest req) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        var purchase = purchaseRepository.findByIdAndTenantId(purchaseId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Compra no encontrada"));
        if (purchase.getStatus() != PurchaseStatus.RECEIVED) {
            throw new IllegalArgumentException("Solo se pueden registrar pagos a compras recibidas");
        }
        BigDecimal amount = scaled(req.amount());
        BigDecimal balance = purchase.getTotal().subtract(paidAmount(tenantId, purchaseId)).setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(balance) > 0) {
            throw new IllegalArgumentException("El pago no puede superar el balance pendiente");
        }
        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        var payment = new PurchasePayment();
        payment.setTenantId(tenantId);
        payment.setPurchaseId(purchase.getId());
        payment.setSupplierId(purchase.getSupplierId());
        payment.setMethod(req.method());
        payment.setAmount(amount);
        payment.setPaidAt(req.paidAt() != null ? req.paidAt() : Instant.now());
        payment.setReference(req.reference());
        payment.setNotes(req.notes());
        payment.setCreatedByUserId(actorId);
        purchasePaymentRepository.save(payment);
        return toResponse(purchase);
    }

    private BranchInventory createBranchInventory(UUID tenantId, UUID branchId, UUID productId) {
        var branchInventory = new BranchInventory(branchId, productId);
        branchInventory.setTenantId(tenantId);
        return branchInventoryRepository.save(branchInventory);
    }

    private PurchaseResponse toResponse(Purchase purchase) {
        var tenantId = purchase.getTenantId();
        String supplierName = supplierRepository.findByIdAndTenantId(purchase.getSupplierId(), tenantId)
                .map(Supplier::getName)
                .orElse("Proveedor eliminado");
        String branchName = branchRepository.findById(purchase.getBranchId())
                .filter(branch -> branch.getTenantId().equals(tenantId))
                .map(Branch::getName)
                .orElse("Sucursal eliminada");
        List<PurchaseItemResponse> items = purchaseItemRepository.findAllByPurchaseId(purchase.getId())
                .stream()
                .map(item -> {
                    var product = productRepository.findById(item.getProductId())
                            .filter(p -> tenantId.equals(p.getTenantId()))
                            .orElse(null);
                    return PurchaseItemResponse.from(
                            item,
                            product != null ? product.getDescription() : "Producto eliminado",
                            product != null ? product.getUnit() : "unit"
                    );
                })
                .toList();
        BigDecimal paid = paidAmount(tenantId, purchase.getId());
        BigDecimal balance = purchase.getTotal().subtract(paid).setScale(2, RoundingMode.HALF_UP);
        return PurchaseResponse.from(purchase, supplierName, branchName, paid, balance, items);
    }

    private BigDecimal scaled(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal paidAmount(UUID tenantId, UUID purchaseId) {
        return purchasePaymentRepository.sumByTenantIdAndPurchaseId(tenantId, purchaseId).setScale(2, RoundingMode.HALF_UP);
    }

    private void ensureModuleEnabled(UUID tenantId) {
        tenantRepository.findById(tenantId)
                .filter(Tenant::isPurchaseModuleEnabled)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Modulo de compras y proveedores no esta activo para este tenant"
                ));
    }
}
