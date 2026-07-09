package rd.dalventa.api.quotation.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.quotation.domain.QuotationItem;

import java.math.BigDecimal;
import java.util.UUID;

public record QuotationItemResponse(
        UUID id,
        @JsonProperty("productId") UUID productId,
        @JsonProperty("productName") String productName,
        @JsonProperty("productUnit") String productUnit,
        int quantity,
        @JsonProperty("unitPrice") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitPrice,
        @JsonProperty("taxRate") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonProperty("lineTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineTotal
) {
    public static QuotationItemResponse from(QuotationItem item, String productName, String productUnit) {
        return new QuotationItemResponse(item.getId(), item.getProductId(), productName, productUnit,
                item.getQuantity(), item.getUnitPrice(), item.getTaxRate(), item.getLineTotal());
    }
}
