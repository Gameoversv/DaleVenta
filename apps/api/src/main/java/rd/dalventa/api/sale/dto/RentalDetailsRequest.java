package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.Instant;

public record RentalDetailsRequest(
        @JsonProperty("expectedReturnAt") Instant expectedReturnAt,
        @JsonProperty("depositAmount") BigDecimal depositAmount,
        String notes
) {
}
