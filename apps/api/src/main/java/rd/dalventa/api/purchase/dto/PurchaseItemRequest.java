package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record PurchaseItemRequest(
        @JsonProperty("productId") @NotNull UUID productId,
        @Positive int quantity,
        @JsonProperty("unitCost") @NotNull @DecimalMin("0.00") BigDecimal unitCost,
        @JsonProperty("taxRate") @DecimalMin("0.00") BigDecimal taxRate,
        @JsonProperty("discountAmount") @DecimalMin("0.00") BigDecimal discountAmount
) {}
