package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.cashshift.domain.CashMovement;
import rd.dalventa.api.cashshift.domain.CashMovementType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CashMovementResponse(
        UUID id,
        CashMovementType type,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount,
        String reason,
        Instant createdAt,
        UUID userId,
        UUID saleId,
        List<DenominationCountEntry> denominations
) {
    public static CashMovementResponse from(CashMovement m) {
        return from(m, List.of());
    }

    public static CashMovementResponse from(CashMovement m, List<DenominationCountEntry> denominations) {
        return new CashMovementResponse(
                m.getId(),
                m.getType(),
                m.getAmount(),
                m.getReason(),
                m.getCreatedAt(),
                m.getUserId(),
                m.getSaleId(),
                denominations
        );
    }
}
