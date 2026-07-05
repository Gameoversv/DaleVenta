package rd.dalventa.api.invoice.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.invoice.domain.InvoiceStatus;

public record UpdateInvoiceStatusRequest(@NotNull InvoiceStatus status) {}
