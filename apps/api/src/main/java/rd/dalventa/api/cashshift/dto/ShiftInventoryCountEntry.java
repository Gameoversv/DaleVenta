package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.cashshift.domain.ShiftInventoryCount;

import java.util.UUID;

public record ShiftInventoryCountEntry(
        @JsonProperty("productId") UUID productId,
        @JsonProperty("openingQuantity") int openingQuantity,
        @JsonProperty("closingQuantity") Integer closingQuantity,
        @JsonProperty("expectedQuantity") Integer expectedQuantity
) {
    public static ShiftInventoryCountEntry from(ShiftInventoryCount count) {
        return new ShiftInventoryCountEntry(count.getProductId(), count.getOpeningQuantity(),
                count.getClosingQuantity(), count.getExpectedQuantity());
    }
}
