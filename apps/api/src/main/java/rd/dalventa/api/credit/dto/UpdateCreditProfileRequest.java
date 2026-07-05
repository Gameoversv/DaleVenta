package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateCreditProfileRequest(
        @JsonProperty("creditEnabled") @NotNull boolean creditEnabled,
        @JsonProperty("creditLimit") @NotNull BigDecimal creditLimit
) {}
