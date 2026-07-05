package rd.dalventa.api.sale.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashMovementType;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionRequest;
import rd.dalventa.api.cashshift.dto.CreateCashMovementRequest;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.cashshift.service.CashMovementService;
import rd.dalventa.api.cashshift.service.CashShiftChangeService;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.inventory.domain.InventoryMovementType;
import rd.dalventa.api.inventory.dto.CreateInventoryMovementRequest;
import rd.dalventa.api.inventory.service.InventoryMovementService;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.sale.domain.Payment;
import rd.dalventa.api.sale.domain.PaymentMethod;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleItem;
import rd.dalventa.api.sale.dto.CreateSaleRequest;
import rd.dalventa.api.sale.dto.PaymentRequest;
import rd.dalventa.api.sale.dto.PaymentResponse;
import rd.dalventa.api.sale.dto.SaleItemRequest;
import rd.dalventa.api.sale.dto.SaleItemResponse;
import rd.dalventa.api.sale.dto.SaleResponse;
import rd.dalventa.api.sale.domain.SaleStatus;
import rd.dalventa.api.sale.domain.TransferPaymentDetail;
import rd.dalventa.api.sale.dto.VoidSaleRequest;
import rd.dalventa.api.sale.repository.PaymentRepository;
import rd.dalventa.api.sale.repository.SaleItemRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.sale.repository.TransferPaymentDetailRepository;
import rd.dalventa.api.cashshift.repository.CashMovementRepository;
import rd.dalventa.api.cashshift.repository.CashMovementDenominationRepository;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final PaymentRepository paymentRepository;
    private final TransferPaymentDetailRepository transferPaymentDetailRepository;
    private final RegisterRepository registerRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CashShiftRepository cashShiftRepository;
    private final InventoryMovementService inventoryMovementService;
    private final CurrentUserProvider currentUserProvider;
    private final CashShiftChangeService cashShiftChangeService;
    private final CashMovementService cashMovementService;
    private final DenominationRepository denominationRepository;
    private final PermissionResolutionService permissionResolutionService;
    private final CashMovementRepository cashMovementRepository;
    private final CashMovementDenominationRepository cashMovementDenominationRepository;

    @Transactional
    public SaleResponse create(CreateSaleRequest req) {
        var tenantId = TenantContext.require();

        var register = registerRepository.findByIdAndTenantId(req.registerId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));

        var cashShift = cashShiftRepository.findByIdAndTenantId(req.cashShiftId(), tenantId)
                .filter(s -> s.getStatus() == CashShiftStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("No hay turno abierto para esta caja"));

        if (req.customerId() != null) {
            customerRepository.findByIdAndTenantIdAndActiveTrue(req.customerId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();

        var sale = new Sale(register.getBranchId(), req.registerId(), req.cashShiftId(), req.customerId(), userId);
        sale.setTenantId(tenantId);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        List<SaleItem> items = new ArrayList<>();

        for (SaleItemRequest itemReq : req.items()) {
            var product = productRepository.findByIdAndTenantId(itemReq.productId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));

            var unitPrice = itemReq.useWholesalePrice() ? product.getWholesalePrice() : product.getSalePrice();
            var lineSubtotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            var lineTax = lineSubtotal.multiply(product.getTaxRate())
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            var lineTotal = lineSubtotal.add(lineTax);

            subtotal = subtotal.add(lineSubtotal);
            taxTotal = taxTotal.add(lineTax);

            var item = new SaleItem(null, product.getId(), itemReq.quantity(), unitPrice, product.getTaxRate(), lineTotal);
            items.add(item);

            if (product.isTracksInventory()) {
                inventoryMovementService.recordMovement(new CreateInventoryMovementRequest(
                        sale.getBranchId(), product.getId(), InventoryMovementType.EXIT,
                        itemReq.quantity(), "Venta"));
            }
        }

        BigDecimal requestedDiscount = req.discountAmount() != null
                ? req.discountAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        boolean canDiscount = requestedDiscount.signum() == 0
                || currentUserProvider.current()
                        .map(user -> permissionResolutionService.has(user, PermissionCode.SALE_DISCOUNT))
                        .orElse(false);
        BigDecimal discountAmount = canDiscount ? requestedDiscount : BigDecimal.ZERO.setScale(2);
        BigDecimal total = subtotal.add(taxTotal).subtract(discountAmount);

        BigDecimal paymentsSum = req.payments().stream()
                .map(PaymentRequest::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (paymentsSum.compareTo(total) != 0) {
            throw new IllegalArgumentException("La suma de los pagos no coincide con el total de la venta");
        }

        sale.setSubtotal(subtotal);
        sale.setTaxTotal(taxTotal);
        sale.setDiscountAmount(discountAmount);
        sale.setTotal(total);
        sale = saleRepository.save(sale);

        for (SaleItem item : items) {
            var persisted = new SaleItem(sale.getId(), item.getProductId(), item.getQuantity(),
                    item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
            persisted.setTenantId(tenantId);
            saleItemRepository.save(persisted);
        }

        for (PaymentRequest paymentReq : req.payments()) {
            if (paymentReq.method() == PaymentMethod.TRANSFER) {
                if (transferPaymentDetailRepository.existsByTenantIdAndBankAndReference(
                        tenantId, paymentReq.bank(), paymentReq.reference())) {
                    throw new DuplicateResourceException("Ya existe una transferencia con esa referencia");
                }
                var payment = new Payment(sale.getId(), PaymentMethod.TRANSFER, paymentReq.amount());
                payment.setTenantId(tenantId);
                payment = paymentRepository.save(payment);

                var detail = new TransferPaymentDetail(payment.getId(), paymentReq.bank(), paymentReq.reference(), paymentReq.amount());
                detail.setTenantId(tenantId);
                transferPaymentDetailRepository.save(detail);
            } else if (paymentReq.method() == PaymentMethod.CASH) {
                var payment = new Payment(sale.getId(), PaymentMethod.CASH, paymentReq.amount());
                payment.setTenantId(tenantId);
                payment = paymentRepository.save(payment);

                BigDecimal receivedTotal = BigDecimal.ZERO;
                for (var entry : paymentReq.receivedDenominations()) {
                    var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                            .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
                    receivedTotal = receivedTotal.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
                }
                BigDecimal changeAmount = receivedTotal.subtract(paymentReq.amount());
                if (changeAmount.signum() < 0) {
                    throw new IllegalArgumentException("El monto recibido es menor al monto de este pago");
                }

                var suggestion = cashShiftChangeService.suggest(new ChangeSuggestionRequest(
                        req.registerId(), changeAmount.multiply(BigDecimal.valueOf(100)).longValueExact(),
                        paymentReq.receivedDenominations()));
                if (!suggestion.exact()) {
                    throw new IllegalArgumentException("No hay combinacion exacta de denominaciones para el cambio");
                }

                cashMovementService.recordMovement(req.cashShiftId(),
                        new CreateCashMovementRequest(CashMovementType.ENTRY,
                                "Venta - efectivo recibido", paymentReq.receivedDenominations()),
                        sale.getId());

                if (changeAmount.signum() > 0) {
                    cashMovementService.recordMovement(req.cashShiftId(),
                            new CreateCashMovementRequest(CashMovementType.WITHDRAWAL,
                                    "Venta - cambio entregado", suggestion.combination()),
                            sale.getId());
                }
            } else {
                throw new IllegalArgumentException("Metodo de pago no soportado en esta version");
            }
        }

        return toResponse(sale);
    }

    @Transactional(readOnly = true)
    public List<SaleResponse> list(java.util.UUID registerId) {
        var tenantId = TenantContext.require();
        return saleRepository.findAllByTenantIdAndRegisterId(tenantId, registerId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public SaleResponse getDetail(java.util.UUID id) {
        var tenantId = TenantContext.require();
        var sale = saleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));
        return toResponse(sale);
    }

    private SaleResponse toResponse(Sale sale) {
        List<SaleItemResponse> items = saleItemRepository.findAllBySaleId(sale.getId())
                .stream().map(SaleItemResponse::from).toList();
        List<PaymentResponse> payments = paymentRepository.findAllBySaleId(sale.getId())
                .stream().map(PaymentResponse::from).toList();
        return SaleResponse.from(sale, items, payments);
    }

    @Transactional
    public SaleResponse voidSale(java.util.UUID id, VoidSaleRequest req) {
        var tenantId = TenantContext.require();
        var sale = saleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        if (sale.getStatus() == SaleStatus.VOIDED) {
            throw new DuplicateResourceException("Esta venta ya esta anulada");
        }

        var cashShift = cashShiftRepository.findByIdAndTenantId(sale.getCashShiftId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
        if (cashShift.getStatus() != CashShiftStatus.OPEN) {
            throw new IllegalArgumentException("No se puede anular: el turno de esta venta ya esta cerrado");
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();

        for (SaleItem item : saleItemRepository.findAllBySaleId(sale.getId())) {
            var product = productRepository.findByIdAndTenantId(item.getProductId(), tenantId).orElseThrow();
            if (product.isTracksInventory()) {
                inventoryMovementService.recordMovement(new CreateInventoryMovementRequest(
                        sale.getBranchId(), item.getProductId(), InventoryMovementType.ENTRY,
                        item.getQuantity(), "Anulacion venta"));
            }
        }

        for (var movement : cashMovementRepository.findAllByTenantIdAndSaleId(tenantId, sale.getId())) {
            var reversedType = movement.getType() == CashMovementType.ENTRY
                    ? CashMovementType.WITHDRAWAL
                    : CashMovementType.ENTRY;
            var denominationEntries = cashMovementDenominationRepository.findAllByCashMovementId(movement.getId())
                    .stream()
                    .map(d -> new DenominationCountEntry(d.getDenominationId(), d.getQuantity()))
                    .toList();
            cashMovementService.recordMovement(sale.getCashShiftId(),
                    new CreateCashMovementRequest(reversedType, "Anulacion venta", denominationEntries),
                    sale.getId());
        }

        sale.setStatus(SaleStatus.VOIDED);
        sale.setVoidedAt(java.time.Instant.now());
        sale.setVoidedBy(userId);
        sale.setVoidReason(req.voidReason());
        saleRepository.save(sale);

        return toResponse(sale);
    }
}
