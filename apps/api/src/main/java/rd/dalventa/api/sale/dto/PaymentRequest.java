package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.sale.domain.PaymentMethod;

import java.math.BigDecimal;
import java.util.List;

public record PaymentRequest(
        @NotNull PaymentMethod method,
        @NotNull BigDecimal amount,
        @JsonProperty("receivedDenominations") List<DenominationCountEntry> receivedDenominations,
        String bank,
        String reference
) {}
