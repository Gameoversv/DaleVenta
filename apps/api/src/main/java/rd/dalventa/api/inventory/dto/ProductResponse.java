package rd.dalventa.api.inventory.dto;

import rd.dalventa.api.inventory.domain.Product;
import rd.dalventa.api.inventory.domain.ProductCategory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String internalCode,
        String description,
        BigDecimal purchaseCost,
        BigDecimal salePrice,
        int currentStock,
        int minStock,
        ProductCategory category,
        boolean lowStock,
        boolean active,
        Instant createdAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(),
                p.getInternalCode(),
                p.getDescription(),
                p.getPurchaseCost(),
                p.getSalePrice(),
                p.getCurrentStock(),
                p.getMinStock(),
                p.getCategory(),
                p.getCurrentStock() <= p.getMinStock(),
                p.isActive(),
                p.getCreatedAt()
        );
    }
}
