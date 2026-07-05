package rd.dalventa.api.quote.dto;

import rd.dalventa.api.quote.domain.Quote;
import rd.dalventa.api.quote.domain.QuoteItem;
import rd.dalventa.api.quote.domain.QuoteItemType;
import rd.dalventa.api.quote.domain.QuoteStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuoteResponse(
        UUID id,
        UUID workOrderId,
        QuoteStatus status,
        boolean applyItbis,
        BigDecimal itbisRate,
        BigDecimal subtotal,
        BigDecimal itbisAmount,
        BigDecimal total,
        String notes,
        List<ItemResponse> items,
        Instant createdAt,
        Instant updatedAt
) {
    public record ItemResponse(
            UUID id,
            QuoteItemType itemType,
            String description,
            int quantity,
            BigDecimal unitPrice,
            BigDecimal subtotal
    ) {
        public static ItemResponse from(QuoteItem i) {
            return new ItemResponse(
                    i.getId(), i.getItemType(), i.getDescription(),
                    i.getQuantity(), i.getUnitPrice(), i.getSubtotal()
            );
        }
    }

    public static QuoteResponse from(Quote q) {
        return new QuoteResponse(
                q.getId(),
                q.getWorkOrder().getId(),
                q.getStatus(),
                q.isApplyItbis(),
                q.getItbisRate(),
                q.getSubtotal(),
                q.getItbisAmount(),
                q.getTotal(),
                q.getNotes(),
                q.getItems().stream().map(ItemResponse::from).toList(),
                q.getCreatedAt(),
                q.getUpdatedAt()
        );
    }
}
