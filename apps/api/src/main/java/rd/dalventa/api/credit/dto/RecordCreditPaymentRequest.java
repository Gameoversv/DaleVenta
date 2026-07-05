package rd.dalventa.api.credit.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record RecordCreditPaymentRequest(
        @NotNull @Positive BigDecimal amount,
        String note
) {}
