package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.purchase.domain.PurchaseItem;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseItemResponse(
        UUID id,
        @JsonProperty("productId") UUID productId,
        @JsonProperty("productName") String productName,
        String unit,
        int quantity,
        @JsonProperty("unitCost") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitCost,
        @JsonProperty("taxRate") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonProperty("discountAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountAmount,
        @JsonProperty("lineTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineTotal
) {
    public static PurchaseItemResponse from(PurchaseItem item, String productName, String unit) {
        return new PurchaseItemResponse(
                item.getId(),
                item.getProductId(),
                productName,
                unit,
                item.getQuantity(),
                item.getUnitCost(),
                item.getTaxRate(),
                item.getDiscountAmount(),
                item.getLineTotal()
        );
    }
}
