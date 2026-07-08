package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.cashshift.domain.CashMovementType;

import java.math.BigDecimal;
import java.util.List;

public record CreateCashMovementRequest(
        @NotNull CashMovementType type,
        @NotBlank String reason,
        @JsonProperty("amount") BigDecimal amount,
        @JsonProperty("denominations") @Valid List<DenominationCountEntry> denominations
) {
    public CreateCashMovementRequest(CashMovementType type, String reason, List<DenominationCountEntry> denominations) {
        this(type, reason, null, denominations);
    }

    public List<DenominationCountEntry> denominations() {
        return denominations == null ? List.of() : denominations;
    }
}
