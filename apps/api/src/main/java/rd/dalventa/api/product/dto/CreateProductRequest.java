package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateProductRequest(
        @JsonProperty("categoryId") UUID categoryId,
        @JsonProperty("internalCode") @NotBlank String internalCode,
        String barcode,
        @NotBlank String description,
        @NotBlank String unit,
        @NotNull BigDecimal cost,
        @JsonProperty("salePrice") @NotNull BigDecimal salePrice,
        @JsonProperty("wholesalePrice") @NotNull BigDecimal wholesalePrice,
        @JsonProperty("taxRate") @NotNull BigDecimal taxRate,
        @JsonProperty("tracksInventory") boolean tracksInventory,
        boolean rentable
) {}
