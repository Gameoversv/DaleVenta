package rd.dalventa.api.quotation.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateQuotationRequest(
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("validUntil") LocalDate validUntil,
        @JsonProperty("discountAmount") BigDecimal discountAmount,
        String notes,
        @NotNull @Valid List<QuotationItemRequest> items
) {
}
