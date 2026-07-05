package rd.dalventa.api.vehicle.dto;

import rd.dalventa.api.invoice.domain.Invoice;
import rd.dalventa.api.invoice.domain.InvoiceStatus;
import rd.dalventa.api.reception.domain.Reception;
import rd.dalventa.api.reception.domain.ReceptionChecklist;
import rd.dalventa.api.workorder.domain.WorkOrder;
import rd.dalventa.api.workorder.domain.WorkOrderItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record VehicleHistoryResponse(
        UUID vehicleId,
        String licensePlate,
        String brand,
        String model,
        int year,
        String vin,
        String customerName,
        int totalVisits,
        List<VisitSummary> visits
) {
    public record VisitSummary(
            UUID receptionId,
            LocalDate receptionDate,
            String complaint,
            ReceptionChecklist checklist,
            String signatureData,
            WorkOrderSummary workOrder
    ) {}

    public record WorkOrderSummary(
            UUID id,
            String status,
            List<ItemSummary> items,
            List<InvoiceSummary> invoices
    ) {}

    public record ItemSummary(
            String type,
            String description,
            BigDecimal quantity,
            BigDecimal unitPrice
    ) {}

    public record InvoiceSummary(
            UUID id,
            String invoiceNumber,
            LocalDate issueDate,
            InvoiceStatus status,
            BigDecimal total
    ) {}

    public static VisitSummary fromReception(Reception r, WorkOrder wo, List<Invoice> invoices) {
        WorkOrderSummary woSummary = null;
        if (wo != null) {
            List<ItemSummary> items = wo.getItems().stream()
                    .<ItemSummary>map(i -> new ItemSummary(i.getType().name(), i.getDescription(), i.getQuantity(), i.getUnitPrice()))
                    .toList();
            List<InvoiceSummary> invSummaries = invoices.stream()
                    .map(inv -> new InvoiceSummary(inv.getId(), inv.getInvoiceNumber(), inv.getIssueDate(), inv.getStatus(), inv.getTotal()))
                    .toList();
            woSummary = new WorkOrderSummary(wo.getId(), wo.getStatus().name(), items, invSummaries);
        }
        return new VisitSummary(
                r.getId(),
                r.getCreatedAt() != null ? r.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate() : null,
                r.getReportedProblem(),
                r.getChecklist(),
                r.getSignatureData(),
                woSummary
        );
    }
}
