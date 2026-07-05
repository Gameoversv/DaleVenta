package rd.dalventa.api.denomination.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.denomination.domain.DenominationType;

import java.math.BigDecimal;

public record CreateDenominationRequest(
        @NotNull BigDecimal value,
        @JsonProperty("type") @NotNull DenominationType type
) {}
