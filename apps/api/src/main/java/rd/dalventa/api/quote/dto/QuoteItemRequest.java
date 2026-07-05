package rd.dalventa.api.quote.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.quote.domain.QuoteItemType;

import java.math.BigDecimal;

public record QuoteItemRequest(
        @NotNull QuoteItemType itemType,
        @NotBlank String description,
        @NotNull @Min(1) Integer quantity,
        @NotNull BigDecimal unitPrice
) {}
