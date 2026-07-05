package rd.dalventa.api.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.inventory.domain.InventoryMovement;
import rd.dalventa.api.inventory.domain.InventoryMovementType;

import java.util.UUID;

public record InventoryMovementResponse(
        UUID id,
        InventoryMovementType type,
        int quantity,
        @JsonProperty("previousStock") int previousStock,
        @JsonProperty("newStock") int newStock,
        String reason
) {
    public static InventoryMovementResponse from(InventoryMovement m) {
        return new InventoryMovementResponse(m.getId(), m.getType(), m.getQuantity(),
                m.getPreviousStock(), m.getNewStock(), m.getReason());
    }
}
