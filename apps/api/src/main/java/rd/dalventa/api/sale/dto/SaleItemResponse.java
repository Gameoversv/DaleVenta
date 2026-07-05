package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.sale.domain.SaleItem;

import java.math.BigDecimal;
import java.util.UUID;

public record SaleItemResponse(
        UUID id,
        @JsonProperty("productId") UUID productId,
        int quantity,
        @JsonProperty("unitPrice") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitPrice,
        @JsonProperty("taxRate") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonProperty("lineTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineTotal
) {
    public static SaleItemResponse from(SaleItem item) {
        return new SaleItemResponse(item.getId(), item.getProductId(), item.getQuantity(),
                item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
    }
}
