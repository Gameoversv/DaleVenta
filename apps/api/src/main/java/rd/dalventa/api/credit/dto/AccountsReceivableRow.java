package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.util.UUID;

public record AccountsReceivableRow(
        UUID customerId,
        String customerName,
        String phone,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal balance,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal creditLimit) {
}
