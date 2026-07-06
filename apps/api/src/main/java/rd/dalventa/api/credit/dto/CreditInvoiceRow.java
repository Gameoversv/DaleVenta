package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreditInvoiceRow(
        @JsonProperty("saleId") UUID saleId,
        @JsonProperty("createdAt") Instant createdAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal chargeAmount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal paidAmount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal outstanding) {
}
