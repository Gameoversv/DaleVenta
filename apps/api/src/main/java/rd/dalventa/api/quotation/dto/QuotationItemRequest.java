package rd.dalventa.api.quotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record QuotationItemRequest(
        @JsonProperty("productId") @NotNull UUID productId,
        @Positive int quantity,
        @JsonProperty("useWholesalePrice") boolean useWholesalePrice
) {
}
