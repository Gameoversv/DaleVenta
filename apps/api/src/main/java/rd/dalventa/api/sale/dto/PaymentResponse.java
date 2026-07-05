package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.sale.domain.Payment;
import rd.dalventa.api.sale.domain.PaymentMethod;

import java.math.BigDecimal;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        PaymentMethod method,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(p.getId(), p.getMethod(), p.getAmount());
    }
}
