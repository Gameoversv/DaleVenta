package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record AccountsReceivableRow(
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("customerName") String customerName,
        String phone,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal balance,
        @JsonProperty("creditLimit") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal creditLimit) {
}
