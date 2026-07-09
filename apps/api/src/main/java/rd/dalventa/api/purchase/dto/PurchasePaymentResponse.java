package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.purchase.domain.PurchasePayment;
import rd.dalventa.api.purchase.domain.PurchasePaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PurchasePaymentResponse(
        UUID id,
        @JsonProperty("purchaseId") UUID purchaseId,
        @JsonProperty("supplierId") UUID supplierId,
        PurchasePaymentMethod method,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
        @JsonProperty("paidAt") Instant paidAt,
        String reference,
        String notes
) {
    public static PurchasePaymentResponse from(PurchasePayment payment) {
        return new PurchasePaymentResponse(
                payment.getId(),
                payment.getPurchaseId(),
                payment.getSupplierId(),
                payment.getMethod(),
                payment.getAmount(),
                payment.getPaidAt(),
                payment.getReference(),
                payment.getNotes()
        );
    }
}
