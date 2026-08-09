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
import rd.dalventa.api.fiscal.service.FiscalService;
import rd.dalventa.api.inventory.domain.InventoryMovementType;
import rd.dalventa.api.inventory.dto.CreateInventoryMovementRequest;
import rd.dalventa.api.inventory.service.InventoryMovementService;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.service.PermissionResolutionService;
import rd.dalventa.api.product.repository.ProductRepository;
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
import rd.dalventa.api.credit.service.CreditService;
import rd.dalventa.api.rental.service.RentalService;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.auth.service.UserOperationalScopeService;
import rd.dalventa.api.report.service.DailyCloseReportService;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class SaleService {

    private static final String USER_NOT_AUTHENTICATED = "Usuario no autenticado";

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final PaymentRepository paymentRepository;
    private final TransferPaymentDetailRepository transferPaymentDetailRepository;
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
    private final CreditService creditService;
    private final AuditLogService auditLogService;
    private final DailyCloseReportService dailyCloseReportService;
    private final FiscalService fiscalService;
    private final TenantRepository tenantRepository;
    private final RentalService rentalService;
    private final UserOperationalScopeService userOperationalScopeService;

    @Transactional
    public SaleResponse create(CreateSaleRequest req) {
        var tenantId = TenantContext.require();
        var register = userOperationalScopeService.requireRegisterAccess(req.registerId());

        requireSellableRegister(req, tenantId);
        requireSellableCustomer(req, tenantId);

        var userId = currentUserId();
        boolean rentalModuleEnabled = rentalModuleEnabled(tenantId);

        var sale = openSale(req, register.getBranchId(), tenantId, userId);
        var priced = priceItems(req, tenantId, sale.getBranchId(), rentalModuleEnabled);

        var discountAmount = resolveDiscount(req);
        var total = priced.subtotal().add(priced.taxTotal()).subtract(discountAmount);
        var rentalDeposit = resolveRentalDeposit(req, priced.hasRentalItems());
        requirePaymentsCover(req, total.add(rentalDeposit));

        sale.setSubtotal(priced.subtotal());
        sale.setTaxTotal(priced.taxTotal());
        sale.setDiscountAmount(discountAmount);
        sale.setTotal(total);
        sale = saleRepository.save(sale);

        var persistedItems = persistItems(priced.items(), sale.getId(), tenantId);
        registerPayments(req, sale, tenantId, userId);

        if (rentalModuleEnabled) {
            rentalService.createForSale(tenantId, sale, persistedItems, req.rentalDetails(), userId);
        }

        return toResponse(sale);
    }

    /** Everything {@link #priceItems} works out in one pass over the requested lines. */
    private record PricedItems(List<SaleItem> items, BigDecimal subtotal, BigDecimal taxTotal, boolean hasRentalItems) {}

    private void requireSellableRegister(CreateSaleRequest req, java.util.UUID tenantId) {
        // Guard only: the sale needs an open shift on this register, but nothing below uses the
        // shift entity itself.
        cashShiftRepository.findByIdAndTenantId(req.cashShiftId(), tenantId)
                .filter(s -> s.getStatus() == CashShiftStatus.OPEN && s.getRegisterId().equals(req.registerId()))
                .orElseThrow(() -> new ResourceNotFoundException("No hay turno abierto para esta caja"));
        if (dailyCloseReportService.isClosed(tenantId, LocalDate.now(ZoneId.systemDefault()), req.registerId())) {
            throw new IllegalArgumentException("No se puede vender: esta caja ya tiene cierre diario guardado para hoy");
        }
    }

    private void requireSellableCustomer(CreateSaleRequest req, java.util.UUID tenantId) {
        if (req.customerId() != null) {
            customerRepository.findByIdAndTenantIdAndActiveTrue(req.customerId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        }

        boolean hasCreditPayment = req.payments().stream().anyMatch(p -> p.method() == PaymentMethod.CREDIT);
        if (!hasCreditPayment) {
            return;
        }
        if (req.customerId() == null) {
            throw new IllegalArgumentException("Una venta a credito requiere un cliente");
        }
        if (!currentUserHas(PermissionCode.CREDIT_AUTHORIZE)) {
            throw new org.springframework.security.access.AccessDeniedException("No tiene permiso para vender a credito");
        }
    }

    private Sale openSale(CreateSaleRequest req, java.util.UUID branchId, java.util.UUID tenantId, java.util.UUID userId) {
        var sale = new Sale(branchId, req.registerId(), req.cashShiftId(), req.customerId(), userId);
        sale.setTenantId(tenantId);
        long invoiceSequence = saleRepository.maxInvoiceSequence(tenantId) + 1;
        sale.setInvoiceSequence(invoiceSequence);
        sale.setInvoiceNumber("FV-%06d".formatted(invoiceSequence));
        if (req.fiscalReceiptType() != null) {
            var fiscalReceipt = fiscalService.issueReceipt(tenantId, req.fiscalReceiptType());
            sale.setFiscalReceiptType(fiscalReceipt.receiptType());
            sale.setFiscalNcf(fiscalReceipt.ncf());
            sale.setFiscalSequenceId(fiscalReceipt.sequenceId());
        }
        return sale;
    }

    /** Prices every line and, for the stock-tracked ones, takes the units out of inventory. */
    private PricedItems priceItems(CreateSaleRequest req, java.util.UUID tenantId, java.util.UUID branchId,
                                   boolean rentalModuleEnabled) {
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        List<SaleItem> items = new ArrayList<>();
        boolean hasRentalItems = false;

        for (SaleItemRequest itemReq : req.items()) {
            var product = productRepository.findByIdAndTenantId(itemReq.productId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
            if (rentalModuleEnabled && product.isRentable()) {
                hasRentalItems = true;
            }

            var unitPrice = itemReq.useWholesalePrice() ? product.getWholesalePrice() : product.getSalePrice();
            var lineSubtotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
            var lineTax = lineSubtotal.multiply(product.getTaxRate())
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);

            subtotal = subtotal.add(lineSubtotal);
            taxTotal = taxTotal.add(lineTax);
            items.add(new SaleItem(null, product.getId(), itemReq.quantity(), unitPrice, product.getTaxRate(),
                    lineSubtotal.add(lineTax)));

            if (product.isTracksInventory()) {
                inventoryMovementService.recordMovement(new CreateInventoryMovementRequest(
                        branchId, product.getId(), InventoryMovementType.EXIT,
                        itemReq.quantity(), "Venta"));
            }
        }

        return new PricedItems(items, subtotal, taxTotal, hasRentalItems);
    }

    /** A discount the cashier is not allowed to grant is dropped rather than rejected. */
    private BigDecimal resolveDiscount(CreateSaleRequest req) {
        BigDecimal requested = req.discountAmount() != null
                ? req.discountAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        boolean allowed = requested.signum() == 0 || currentUserHas(PermissionCode.SALE_DISCOUNT);
        return allowed ? requested : BigDecimal.ZERO.setScale(2);
    }

    private BigDecimal resolveRentalDeposit(CreateSaleRequest req, boolean hasRentalItems) {
        if (!hasRentalItems) {
            return BigDecimal.ZERO.setScale(2);
        }
        if (req.customerId() == null) {
            throw new IllegalArgumentException("Un alquiler requiere cliente");
        }
        if (req.rentalDetails() == null || req.rentalDetails().expectedReturnAt() == null) {
            throw new IllegalArgumentException("Un alquiler requiere fecha esperada de devolucion");
        }
        var deposit = req.rentalDetails().depositAmount() != null
                ? req.rentalDetails().depositAmount().setScale(2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        if (deposit.signum() < 0) {
            throw new IllegalArgumentException("El deposito no puede ser negativo");
        }
        return deposit;
    }

    private void requirePaymentsCover(CreateSaleRequest req, BigDecimal amountToCollect) {
        BigDecimal paymentsSum = req.payments().stream()
                .map(PaymentRequest::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (paymentsSum.compareTo(amountToCollect) != 0) {
            throw new IllegalArgumentException("La suma de los pagos no coincide con el total de la venta");
        }
    }

    private List<SaleItem> persistItems(List<SaleItem> items, java.util.UUID saleId, java.util.UUID tenantId) {
        List<SaleItem> persistedItems = new ArrayList<>();
        for (SaleItem item : items) {
            var persisted = new SaleItem(saleId, item.getProductId(), item.getQuantity(),
                    item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
            persisted.setTenantId(tenantId);
            persistedItems.add(saleItemRepository.save(persisted));
        }
        return persistedItems;
    }

    private void registerPayments(CreateSaleRequest req, Sale sale, java.util.UUID tenantId, java.util.UUID userId) {
        for (PaymentRequest paymentReq : req.payments()) {
            switch (paymentReq.method()) {
                case TRANSFER -> registerTransferPayment(paymentReq, sale, tenantId);
                case CASH -> registerCashPayment(req, paymentReq, sale, tenantId);
                case CREDIT -> registerCreditPayment(req, paymentReq, sale, tenantId, userId);
                default -> throw new IllegalArgumentException("Metodo de pago no soportado en esta version");
            }
        }
    }

    private void registerTransferPayment(PaymentRequest paymentReq, Sale sale, java.util.UUID tenantId) {
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
    }

    private void registerCashPayment(CreateSaleRequest req, PaymentRequest paymentReq, Sale sale, java.util.UUID tenantId) {
        var payment = new Payment(sale.getId(), PaymentMethod.CASH, paymentReq.amount());
        payment.setTenantId(tenantId);
        paymentRepository.save(payment);

        if (cashDenominationsEnabled(tenantId)) {
            settleCashDenominations(req, paymentReq, sale, tenantId);
            return;
        }

        cashMovementService.recordMovement(req.cashShiftId(),
                new CreateCashMovementRequest(CashMovementType.ENTRY,
                        "Venta - efectivo", paymentReq.amount(), List.of()),
                sale.getId());
    }

    /**
     * Moves the counted bills into the drawer and the change back out. The sale is refused when the
     * drawer cannot make the exact change, so the cashier is never left improvising.
     */
    private void settleCashDenominations(CreateSaleRequest req, PaymentRequest paymentReq, Sale sale,
                                         java.util.UUID tenantId) {
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
    }

    private void registerCreditPayment(CreateSaleRequest req, PaymentRequest paymentReq, Sale sale,
                                       java.util.UUID tenantId, java.util.UUID userId) {
        var payment = new Payment(sale.getId(), PaymentMethod.CREDIT, paymentReq.amount());
        payment.setTenantId(tenantId);
        paymentRepository.save(payment);

        creditService.charge(tenantId, req.customerId(), paymentReq.amount(), sale.getId(), userId);
    }

    private boolean currentUserHas(PermissionCode permission) {
        return currentUserProvider.current()
                .map(user -> permissionResolutionService.has(user, permission))
                .orElse(false);
    }

    private boolean rentalModuleEnabled(java.util.UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"))
                .isRentalModuleEnabled();
    }

    @Transactional(readOnly = true)
    public List<SaleResponse> list(java.util.UUID registerId) {
        var tenantId = TenantContext.require();
        userOperationalScopeService.requireRegisterAccess(registerId);
        var sales = hasFullSaleHistory()
                ? saleRepository.findAllByTenantIdAndRegisterIdOrderByCreatedAtDesc(tenantId, registerId)
                : saleRepository.findAllByTenantIdAndRegisterIdAndUserIdOrderByCreatedAtDesc(
                        tenantId, registerId, currentUserId());
        return sales.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SaleResponse> listByCustomer(java.util.UUID customerId) {
        var tenantId = TenantContext.require();
        var sales = hasFullSaleHistory()
                ? saleRepository.findAllByTenantIdAndCustomerIdOrderByCreatedAtDesc(tenantId, customerId)
                : saleRepository.findAllByTenantIdAndCustomerIdAndUserIdOrderByCreatedAtDesc(
                        tenantId, customerId, currentUserId());
        return sales.stream().map(this::toResponse).toList();
    }

    private boolean hasFullSaleHistory() {
        return currentUserProvider.current()
                .map(user -> permissionResolutionService.has(user, PermissionCode.SALE_VIEW_HISTORY))
                .orElse(false);
    }

    private boolean cashDenominationsEnabled(java.util.UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"))
                .isCashDenominationsEnabled();
    }

    private java.util.UUID currentUserId() {
        return currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException(USER_NOT_AUTHENTICATED))
                .getId();
    }

    @Transactional(readOnly = true)
    public SaleResponse getDetail(java.util.UUID id) {
        var tenantId = TenantContext.require();
        var sale = saleRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));
        userOperationalScopeService.requireRegisterAccess(sale.getRegisterId());
        if (!hasFullSaleHistory() && !sale.getUserId().equals(currentUserId())) {
            throw new ResourceNotFoundException("Venta no encontrada");
        }
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
        userOperationalScopeService.requireRegisterAccess(sale.getRegisterId());

        if (sale.getStatus() == SaleStatus.VOIDED) {
            throw new DuplicateResourceException("Esta venta ya esta anulada");
        }

        var cashShift = cashShiftRepository.findByIdAndTenantId(sale.getCashShiftId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
        if (cashShift.getStatus() != CashShiftStatus.OPEN) {
            throw new IllegalArgumentException("No se puede anular: el turno de esta venta ya esta cerrado");
        }
        var saleDate = LocalDate.ofInstant(sale.getCreatedAt(), ZoneId.systemDefault());
        if (dailyCloseReportService.isClosed(tenantId, saleDate, sale.getRegisterId())) {
            throw new IllegalArgumentException("No se puede anular: esta caja ya tiene cierre diario guardado para la fecha de la venta");
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException(USER_NOT_AUTHENTICATED))
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

        for (Payment payment : paymentRepository.findAllBySaleId(sale.getId())) {
            if (payment.getMethod() == PaymentMethod.CREDIT) {
                creditService.reverseCharge(tenantId, sale.getCustomerId(), payment.getAmount(), sale.getId(), userId);
            }
        }
        rentalService.cancelBySaleId(tenantId, sale.getId());

        sale.setStatus(SaleStatus.VOIDED);
        sale.setVoidedAt(java.time.Instant.now());
        sale.setVoidedBy(userId);
        sale.setVoidReason(req.voidReason());
        saleRepository.save(sale);

        auditLogService.recordEvent(AuditAction.SALE_VOID, "SALE", sale.getId(), userId, req.voidReason());

        return toResponse(sale);
    }
}
