package rd.dalventa.api.portal.dto;

import rd.dalventa.api.invoice.domain.Invoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PortalInvoiceResponse(
        UUID id,
        String invoiceNumber,
        LocalDate issueDate,
        String status,
        BigDecimal total,
        String vehicleLabel
) {
    public static PortalInvoiceResponse from(Invoice inv) {
        var vehicle = inv.getWorkOrder().getReception().getVehicle();
        String label = vehicle.getBrand() + " " + vehicle.getModel() + " · " + vehicle.getLicensePlate();
        return new PortalInvoiceResponse(
                inv.getId(),
                inv.getInvoiceNumber(),
                inv.getIssueDate(),
                inv.getStatus().name(),
                inv.getTotal(),
                label
        );
    }
}
