package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CashShiftSummaryResponse(
        UUID id,
        @JsonProperty("registerId") UUID registerId,
        CashShiftStatus status,
        @JsonProperty("openedAt") Instant openedAt,
        @JsonProperty("closedAt") Instant closedAt,
        @JsonProperty("openingTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal openingTotal,
        @JsonProperty("expectedCash") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal expectedCash,
        @JsonProperty("countedCash") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal countedCash,
        @JsonProperty("cashDifference") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference,
        List<CashShiftDenominationEntry> denominations
) {
    public static CashShiftSummaryResponse from(CashShift shift, BigDecimal expectedCash, List<CashShiftDenominationEntry> denominations) {
        return new CashShiftSummaryResponse(shift.getId(), shift.getRegisterId(), shift.getStatus(),
                shift.getOpenedAt(), shift.getClosedAt(), shift.getOpeningTotal(), expectedCash,
                shift.getCountedCash(), shift.getCashDifference(), denominations);
    }
}
