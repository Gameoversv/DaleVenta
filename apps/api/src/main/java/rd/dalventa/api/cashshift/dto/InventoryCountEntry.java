package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.UUID;

public record InventoryCountEntry(
        @JsonProperty("productId") @NotNull UUID productId,
        @PositiveOrZero int quantity
) {}
