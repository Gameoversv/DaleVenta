package rd.dalventa.api.quotation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.quotation.domain.Quotation;
import rd.dalventa.api.quotation.domain.QuotationItem;
import rd.dalventa.api.quotation.dto.CreateQuotationRequest;
import rd.dalventa.api.quotation.dto.QuotationItemRequest;
import rd.dalventa.api.quotation.dto.QuotationItemResponse;
import rd.dalventa.api.quotation.dto.QuotationResponse;
import rd.dalventa.api.quotation.repository.QuotationItemRepository;
import rd.dalventa.api.quotation.repository.QuotationRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final QuotationItemRepository quotationItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public QuotationResponse create(CreateQuotationRequest req) {
        var tenantId = TenantContext.require();
        if (req.items() == null || req.items().isEmpty()) {
            throw new IllegalArgumentException("La cotizacion requiere al menos un producto");
        }
        if (req.customerId() != null) {
            customerRepository.findByIdAndTenantIdAndActiveTrue(req.customerId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        long sequence = quotationRepository.maxQuotationSequence(tenantId) + 1;
        var quotation = new Quotation("CT-%06d".formatted(sequence), req.customerId(), userId, req.validUntil(), req.notes());
        quotation.setTenantId(tenantId);

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        List<QuotationItem> items = new ArrayList<>();

        for (QuotationItemRequest itemReq : req.items()) {
            Product product = productRepository.findByIdAndTenantId(itemReq.productId(), tenantId)
                    .filter(Product::isActive)
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado"));
            BigDecimal unitPrice = itemReq.useWholesalePrice() ? product.getWholesalePrice() : product.getSalePrice();
            BigDecimal lineSubtotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal lineTax = lineSubtotal.multiply(product.getTaxRate())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal lineTotal = lineSubtotal.add(lineTax);
            subtotal = subtotal.add(lineSubtotal);
            taxTotal = taxTotal.add(lineTax);
            items.add(new QuotationItem(null, product.getId(), itemReq.quantity(), unitPrice, product.getTaxRate(), lineTotal));
        }

        BigDecimal discount = req.discountAmount() != null
                ? req.discountAmount().setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2);
        if (discount.signum() < 0) {
            throw new IllegalArgumentException("El descuento no puede ser negativo");
        }
        BigDecimal total = subtotal.add(taxTotal).subtract(discount);
        if (total.signum() < 0) {
            throw new IllegalArgumentException("El descuento no puede superar el total");
        }

        quotation.setTotals(subtotal, taxTotal, discount, total);
        quotation = quotationRepository.save(quotation);
        for (QuotationItem item : items) {
            var persisted = new QuotationItem(quotation.getId(), item.getProductId(), item.getQuantity(),
                    item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
            persisted.setTenantId(tenantId);
            quotationItemRepository.save(persisted);
        }
        return toResponse(quotation);
    }

    @Transactional(readOnly = true)
    public List<QuotationResponse> list() {
        var tenantId = TenantContext.require();
        return quotationRepository.findAllByTenantIdOrderByCreatedAtDesc(tenantId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public QuotationResponse detail(UUID id) {
        var tenantId = TenantContext.require();
        var quotation = quotationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cotizacion no encontrada"));
        return toResponse(quotation);
    }

    private QuotationResponse toResponse(Quotation quotation) {
        var tenantId = quotation.getTenantId();
        String customerName = quotation.getCustomerId() == null
                ? "Cliente de contado"
                : customerRepository.findByIdAndTenantIdAndActiveTrue(quotation.getCustomerId(), tenantId)
                        .map(c -> c.getFirstName() + " " + c.getLastName())
                        .orElse("Cliente eliminado");
        List<QuotationItemResponse> items = quotationItemRepository.findAllByQuotationId(quotation.getId())
                .stream()
                .map(item -> {
                    var product = productRepository.findById(item.getProductId())
                            .filter(p -> tenantId.equals(p.getTenantId()))
                            .orElse(null);
                    return QuotationItemResponse.from(
                            item,
                            product != null ? product.getDescription() : "Producto eliminado",
                            product != null ? product.getUnit() : "unit"
                    );
                })
                .toList();
        return QuotationResponse.from(quotation, customerName, items);
    }
}
