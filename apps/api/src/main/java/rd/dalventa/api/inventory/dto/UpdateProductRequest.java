package rd.dalventa.api.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import rd.dalventa.api.inventory.domain.ProductCategory;

import java.math.BigDecimal;

public record UpdateProductRequest(
        @Size(max = 50) String internalCode,
        String description,
        @DecimalMin("0.00") BigDecimal purchaseCost,
        @DecimalMin("0.00") BigDecimal salePrice,
        @Min(0) Integer currentStock,
        @Min(0) Integer minStock,
        ProductCategory category
) {}
