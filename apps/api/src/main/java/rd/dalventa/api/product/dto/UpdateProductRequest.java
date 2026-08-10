package rd.dalventa.api.product.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record UpdateProductRequest(
        @JsonProperty("categoryId") @NotNull UUID categoryId,
        @NotBlank(message = "La descripcion es obligatoria") String description,
        @NotBlank(message = "La unidad es obligatoria")
        @Size(max = 30, message = "La unidad no puede pasar de 30 caracteres")
        String unit,
        @NotNull BigDecimal cost,
        @JsonProperty("salePrice") @NotNull BigDecimal salePrice,
        @JsonProperty("wholesalePrice") @NotNull BigDecimal wholesalePrice,
        @JsonProperty("taxRate") @NotNull BigDecimal taxRate,
        @JsonProperty("tracksInventory") boolean tracksInventory,
        boolean rentable,
        boolean active
) {}
