package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record DenominationCountEntry(
        @JsonProperty("denominationId") @NotNull UUID denominationId,
        @Positive int quantity
) {}
