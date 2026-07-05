package rd.dalventa.api.quote.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record CreateQuoteRequest(
        @NotNull UUID workOrderId,
        boolean applyItbis,
        String notes,
        @NotEmpty @Valid List<QuoteItemRequest> items
) {}
