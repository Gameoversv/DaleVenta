package rd.dalventa.api.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import rd.dalventa.api.inventory.domain.InventoryMovementType;

import java.util.UUID;

public record CreateInventoryMovementRequest(
        @JsonProperty("branchId") @NotNull UUID branchId,
        @JsonProperty("productId") @NotNull UUID productId,
        @NotNull InventoryMovementType type,
        @Positive int quantity,
        @NotBlank String reason
) {}
