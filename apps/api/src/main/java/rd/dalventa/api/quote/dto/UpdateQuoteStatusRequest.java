package rd.dalventa.api.quote.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.quote.domain.QuoteStatus;

public record UpdateQuoteStatusRequest(@NotNull QuoteStatus status) {}
