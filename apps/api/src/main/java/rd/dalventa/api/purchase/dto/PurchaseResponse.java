package rd.dalventa.api.purchase.dto;

import rd.dalventa.api.purchase.domain.Purchase;
import rd.dalventa.api.purchase.domain.PurchaseItem;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PurchaseResponse(
        UUID id,
        UUID supplierId,
        String supplierName,
        LocalDate purchaseDate,
        BigDecimal total,
        String notes,
        List<ItemResponse> items,
        Instant createdAt
) {
    public record ItemResponse(
            UUID id,
            UUID productId,
            String productCode,
            String productDescription,
            int quantity,
            BigDecimal unitCost,
            BigDecimal subtotal
    ) {
        public static ItemResponse from(PurchaseItem i) {
            return new ItemResponse(
                    i.getId(),
                    i.getProduct().getId(),
                    i.getProduct().getInternalCode(),
                    i.getProduct().getDescription(),
                    i.getQuantity(),
                    i.getUnitCost(),
                    i.getSubtotal()
            );
        }
    }

    public static PurchaseResponse from(Purchase p) {
        return new PurchaseResponse(
                p.getId(),
                p.getSupplier().getId(),
                p.getSupplier().getName(),
                p.getPurchaseDate(),
                p.getTotal(),
                p.getNotes(),
                p.getItems().stream().map(ItemResponse::from).toList(),
                p.getCreatedAt()
        );
    }
}
