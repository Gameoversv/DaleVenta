package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record VoidSaleRequest(
        @JsonProperty("voidReason") @NotBlank String voidReason
) {}
