package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.cashshift.domain.CashMovement;
import rd.dalventa.api.cashshift.domain.CashMovementType;

import java.math.BigDecimal;
import java.util.UUID;

public record CashMovementResponse(
        UUID id,
        CashMovementType type,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
        String reason
) {
    public static CashMovementResponse from(CashMovement m) {
        return new CashMovementResponse(m.getId(), m.getType(), m.getAmount(), m.getReason());
    }
}
