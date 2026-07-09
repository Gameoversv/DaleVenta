package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.purchase.domain.PurchasePaymentMethod;

import java.math.BigDecimal;
import java.time.Instant;

public record RecordPurchasePaymentRequest(
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        @NotNull PurchasePaymentMethod method,
        @JsonProperty("paidAt") Instant paidAt,
        String reference,
        String notes
) {
}
