package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record SaleItemRequest(
        @JsonProperty("productId") @NotNull UUID productId,
        @Positive int quantity,
        @JsonProperty("useWholesalePrice") boolean useWholesalePrice
) {}
