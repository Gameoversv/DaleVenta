package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.product.domain.Product;

import java.math.BigDecimal;
import java.util.UUID;

// BigDecimal money/rate fields are serialized as JSON strings (JsonFormat.Shape.STRING) rather
// than bare numbers. Jayway JsonPath's default provider reads bare JSON numbers as Double, which
// silently drops trailing decimal zeros (150.00 -> 150.0) and breaks exact scale comparisons in
// tests and any client that cares about currency precision.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductResponse(
        UUID id,
        @JsonProperty("categoryId") UUID categoryId,
        @JsonProperty("internalCode") String internalCode,
        String barcode,
        String description,
        String unit,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cost,
        @JsonProperty("salePrice") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal salePrice,
        @JsonProperty("wholesalePrice") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal wholesalePrice,
        @JsonProperty("taxRate") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonProperty("tracksInventory") boolean tracksInventory,
        boolean rentable,
        boolean active
) {
    public static ProductResponse from(Product p, boolean showCost, boolean showPrice) {
        return new ProductResponse(
                p.getId(), p.getCategoryId(), p.getInternalCode(), p.getBarcode(), p.getDescription(),
                p.getUnit(),
                showCost ? p.getCost() : null,
                showPrice ? p.getSalePrice() : null,
                showPrice ? p.getWholesalePrice() : null,
                p.getTaxRate(), p.isTracksInventory(), p.isRentable(), p.isActive()
        );
    }
}
