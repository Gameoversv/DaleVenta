package rd.dalventa.api.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.inventory.domain.BranchInventory;

import java.util.UUID;

public record BranchInventoryResponse(
        @JsonProperty("productId") UUID productId,
        @JsonProperty("currentStock") int currentStock,
        @JsonProperty("minStock") Integer minStock,
        @JsonProperty("maxStock") Integer maxStock
) {
    public static BranchInventoryResponse from(BranchInventory bi) {
        return new BranchInventoryResponse(bi.getProductId(), bi.getCurrentStock(), bi.getMinStock(), bi.getMaxStock());
    }
}
