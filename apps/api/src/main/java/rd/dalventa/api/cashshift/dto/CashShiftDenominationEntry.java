package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;

import java.util.UUID;

public record CashShiftDenominationEntry(
        @JsonProperty("denominationId") UUID denominationId,
        @JsonProperty("openingQuantity") int openingQuantity,
        @JsonProperty("currentQuantity") int currentQuantity,
        @JsonProperty("closingQuantity") Integer closingQuantity
) {
    public static CashShiftDenominationEntry from(CashShiftDenomination csd) {
        return new CashShiftDenominationEntry(csd.getDenominationId(), csd.getOpeningQuantity(),
                csd.getCurrentQuantity(), csd.getClosingQuantity());
    }
}
