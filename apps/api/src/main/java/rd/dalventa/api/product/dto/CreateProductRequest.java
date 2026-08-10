package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

// Los @Size reflejan el ancho de las columnas de products (V11__products.sql).
public record CreateProductRequest(
        @JsonProperty("categoryId") UUID categoryId,
        @JsonProperty("internalCode")
        @NotBlank(message = "El codigo interno es obligatorio")
        @Size(max = 50, message = "El codigo interno no puede pasar de 50 caracteres")
        String internalCode,
        @Size(max = 50, message = "El codigo de barras no puede pasar de 50 caracteres") String barcode,
        @NotBlank(message = "La descripcion es obligatoria") String description,
        @NotBlank(message = "La unidad es obligatoria")
        @Size(max = 30, message = "La unidad no puede pasar de 30 caracteres")
        String unit,
        @NotNull BigDecimal cost,
        @JsonProperty("salePrice") @NotNull BigDecimal salePrice,
        @JsonProperty("wholesalePrice") @NotNull BigDecimal wholesalePrice,
        @JsonProperty("taxRate") @NotNull BigDecimal taxRate,
        @JsonProperty("tracksInventory") boolean tracksInventory,
        boolean rentable
) {}
