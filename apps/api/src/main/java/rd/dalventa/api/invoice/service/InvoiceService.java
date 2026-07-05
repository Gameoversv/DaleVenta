package rd.dalventa.api.invoice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.invoice.domain.Invoice;
import rd.dalventa.api.invoice.domain.InvoiceItem;
import rd.dalventa.api.invoice.domain.InvoiceStatus;
import rd.dalventa.api.invoice.dto.CreateInvoiceRequest;
import rd.dalventa.api.invoice.dto.InvoiceResponse;
import rd.dalventa.api.invoice.dto.UpdateInvoiceStatusRequest;
import rd.dalventa.api.invoice.repository.InvoiceRepository;
import rd.dalventa.api.payment.repository.PaymentRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.workorder.repository.WorkOrderRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final WorkOrderRepository workOrderRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public ApiResponse<List<InvoiceResponse>> list(int page, int size) {
        UUID tenantId = TenantContext.require();
        var result = invoiceRepository.findAllWithDetails(tenantId, PageRequest.of(page, size));
        var data = result.getContent().stream()
                .map(inv -> InvoiceResponse.from(inv, paymentRepository.sumAmountByInvoiceId(inv.getId())))
                .toList();
        return ApiResponse.paged(data, result.getTotalElements(), page, size);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse findById(UUID id) {
        UUID tenantId = TenantContext.require();
        return invoiceRepository.findByIdWithDetails(id, tenantId)
                .map(inv -> InvoiceResponse.from(inv, paymentRepository.sumAmountByInvoiceId(inv.getId())))
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada: " + id));
    }

    @Transactional
    public InvoiceResponse create(CreateInvoiceRequest req) {
        UUID tenantId = TenantContext.require();
        var workOrder = workOrderRepository.findByIdWithDetails(req.workOrderId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada: " + req.workOrderId()));

        var invoice = new Invoice();
        invoice.setTenantId(tenantId);
        invoice.setWorkOrder(workOrder);
        invoice.setIssueDate(req.issueDate() != null ? req.issueDate() : LocalDate.now());
        invoice.setApplyItbis(req.applyItbis());
        invoice.setNotes(req.notes());
        invoice.setInvoiceNumber(generateNumber(tenantId));

        BigDecimal subtotal = BigDecimal.ZERO;

        for (var itemReq : req.items()) {
            var item = new InvoiceItem();
            item.setInvoice(invoice);
            item.setItemType(itemReq.itemType());
            item.setDescription(itemReq.description());
            item.setQuantity(itemReq.quantity());
            item.setUnitPrice(itemReq.unitPrice());

            BigDecimal itemSubtotal = itemReq.unitPrice()
                    .multiply(BigDecimal.valueOf(itemReq.quantity()))
                    .setScale(2, RoundingMode.HALF_UP);
            item.setSubtotal(itemSubtotal);
            subtotal = subtotal.add(itemSubtotal);
            invoice.getItems().add(item);
        }

        BigDecimal itbisAmount = req.applyItbis()
                ? subtotal.multiply(invoice.getItbisRate()).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        invoice.setSubtotal(subtotal);
        invoice.setItbisAmount(itbisAmount);
        invoice.setTotal(subtotal.add(itbisAmount));

        var saved = invoiceRepository.save(invoice);
        return invoiceRepository.findByIdWithDetails(saved.getId(), tenantId)
                .map(inv -> InvoiceResponse.from(inv, BigDecimal.ZERO))
                .orElseThrow();
    }

    @Transactional
    public InvoiceResponse updateStatus(UUID id, UpdateInvoiceStatusRequest req) {
        UUID tenantId = TenantContext.require();
        var invoice = invoiceRepository.findByIdWithDetails(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada: " + id));

        if (invoice.getStatus() == InvoiceStatus.ANULADA) {
            throw new IllegalStateException("Factura anulada no puede cambiar de estado");
        }

        invoice.setStatus(req.status());
        invoiceRepository.save(invoice);
        return invoiceRepository.findByIdWithDetails(id, tenantId)
                .map(inv -> InvoiceResponse.from(inv, paymentRepository.sumAmountByInvoiceId(id)))
                .orElseThrow();
    }

    private String generateNumber(UUID tenantId) {
        int year = LocalDate.now().getYear();
        int next = invoiceRepository.findMaxSeqForYear(tenantId, year) + 1;
        return String.format("FAC-%d-%04d", year, next);
    }
}
