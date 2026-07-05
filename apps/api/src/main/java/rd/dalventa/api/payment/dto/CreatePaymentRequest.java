package rd.dalventa.api.payment.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreatePaymentRequest(
        UUID invoiceId,
        BigDecimal amount,
        LocalDate paymentDate,
        String paymentMethod,
        String notes
) {}
