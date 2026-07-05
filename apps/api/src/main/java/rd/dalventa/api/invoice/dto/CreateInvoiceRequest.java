package rd.dalventa.api.invoice.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.invoice.domain.InvoiceItemType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateInvoiceRequest(
        @NotNull UUID workOrderId,
        @NotNull LocalDate issueDate,
        boolean applyItbis,
        String notes,
        @NotEmpty @Valid List<ItemRequest> items
) {
    public record ItemRequest(
            @NotNull InvoiceItemType itemType,
            @NotNull String description,
            @NotNull Integer quantity,
            @NotNull BigDecimal unitPrice
    ) {}
}
