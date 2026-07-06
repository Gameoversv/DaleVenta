package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record RecordCreditPaymentRequest(
        @NotNull @Positive BigDecimal amount,
        String note,
        @JsonProperty("saleId") UUID saleId,
        @JsonProperty("payerName") String payerName
) {}
