package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.util.List;
import java.util.UUID;

public record ChangeSuggestionRequest(
        @JsonProperty("registerId") @NotNull UUID registerId,
        @JsonProperty("changeAmountCents") @PositiveOrZero long changeAmountCents,
        @JsonProperty("receivedDenominations") List<DenominationCountEntry> receivedDenominations
) {}
