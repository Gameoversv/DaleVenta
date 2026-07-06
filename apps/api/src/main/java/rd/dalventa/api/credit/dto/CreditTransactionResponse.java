package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.credit.domain.CreditTransaction;
import rd.dalventa.api.credit.domain.CreditTransactionType;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditTransactionResponse(
        UUID id,
        CreditTransactionType type,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
        @JsonProperty("saleId") UUID saleId,
        String note,
        @JsonProperty("payerName") String payerName
) {
    public static CreditTransactionResponse from(CreditTransaction t) {
        return new CreditTransactionResponse(t.getId(), t.getType(), t.getAmount(), t.getSaleId(), t.getNote(), t.getPayerName());
    }
}
