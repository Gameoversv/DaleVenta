package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.sale.domain.PaymentMethod;

import java.math.BigDecimal;

public record PaymentMethodReportItem(
        PaymentMethod method,
        long paymentsCount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount
) {}
