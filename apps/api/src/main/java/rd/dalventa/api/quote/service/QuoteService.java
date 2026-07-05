package rd.dalventa.api.quote.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.quote.domain.Quote;
import rd.dalventa.api.quote.domain.QuoteItem;
import rd.dalventa.api.quote.domain.QuoteStatus;
import rd.dalventa.api.quote.dto.CreateQuoteRequest;
import rd.dalventa.api.quote.dto.QuoteResponse;
import rd.dalventa.api.quote.dto.UpdateQuoteStatusRequest;
import rd.dalventa.api.quote.repository.QuoteRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.workorder.repository.WorkOrderRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QuoteService {

    private final QuoteRepository quoteRepository;
    private final WorkOrderRepository workOrderRepository;

    @Transactional(readOnly = true)
    public List<QuoteResponse> findByWorkOrder(UUID workOrderId) {
        UUID tenantId = TenantContext.require();
        return quoteRepository.findByWorkOrderId(tenantId, workOrderId)
                .stream().map(QuoteResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public QuoteResponse findById(UUID id) {
        return quoteRepository.findByIdWithItems(id, TenantContext.require())
                .map(QuoteResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Cotización no encontrada: " + id));
    }

    @Transactional
    public QuoteResponse create(CreateQuoteRequest req) {
        UUID tenantId = TenantContext.require();
        var workOrder = workOrderRepository.findByIdWithDetails(req.workOrderId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + req.workOrderId()));

        var quote = new Quote();
        quote.setTenantId(tenantId);
        quote.setWorkOrder(workOrder);
        quote.setApplyItbis(req.applyItbis());
        quote.setNotes(req.notes());

        BigDecimal subtotal = BigDecimal.ZERO;

        for (var itemReq : req.items()) {
            var item = new QuoteItem();
            item.setQuote(quote);
            item.setItemType(itemReq.itemType());
            item.setDescription(itemReq.description());
            item.setQuantity(itemReq.quantity());
            item.setUnitPrice(itemReq.unitPrice());

            BigDecimal itemSubtotal = itemReq.unitPrice()
                    .multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            item.setSubtotal(itemSubtotal);
            subtotal = subtotal.add(itemSubtotal);

            quote.getItems().add(item);
        }

        BigDecimal itbisAmount = req.applyItbis()
                ? subtotal.multiply(quote.getItbisRate()).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        quote.setSubtotal(subtotal);
        quote.setItbisAmount(itbisAmount);
        quote.setTotal(subtotal.add(itbisAmount));

        return QuoteResponse.from(quoteRepository.save(quote));
    }

    @Transactional
    public QuoteResponse updateStatus(UUID id, UpdateQuoteStatusRequest req) {
        var quote = quoteRepository.findByIdWithItems(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Cotización no encontrada: " + id));

        if (quote.getStatus() != QuoteStatus.PENDIENTE) {
            throw new IllegalStateException("Solo cotizaciones PENDIENTE pueden cambiar de estado");
        }

        quote.setStatus(req.status());
        return QuoteResponse.from(quoteRepository.save(quote));
    }
}
