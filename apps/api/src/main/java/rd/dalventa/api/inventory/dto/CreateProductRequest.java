package rd.dalventa.api.inventory.dto;

import jakarta.validation.constraints.*;
import rd.dalventa.api.inventory.domain.ProductCategory;

import java.math.BigDecimal;

public record CreateProductRequest(
        @NotBlank @Size(max = 50) String internalCode,
        @NotBlank String description,
        @NotNull @DecimalMin("0.00") BigDecimal purchaseCost,
        @NotNull @DecimalMin("0.00") BigDecimal salePrice,
        @NotNull @Min(0) Integer currentStock,
        @NotNull @Min(0) Integer minStock,
        @NotNull ProductCategory category
) {}
