package rd.dalventa.api.rental.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.rental.domain.RentalContractItem;

import java.util.UUID;

public record RentalContractItemResponse(
        UUID id,
        @JsonProperty("productId") UUID productId,
        @JsonProperty("productName") String productName,
        int quantity
) {
    public static RentalContractItemResponse from(RentalContractItem item, String productName) {
        return new RentalContractItemResponse(item.getId(), item.getProductId(), productName, item.getQuantity());
    }
}
