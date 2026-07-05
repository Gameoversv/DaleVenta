package rd.dalventa.api.denomination.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.denomination.domain.Denomination;
import rd.dalventa.api.denomination.domain.DenominationType;

import java.math.BigDecimal;
import java.util.UUID;

public record DenominationResponse(
        UUID id,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal value,
        DenominationType type,
        boolean active
) {
    public static DenominationResponse from(Denomination d) {
        return new DenominationResponse(d.getId(), d.getValue(), d.getType(), d.isActive());
    }
}
