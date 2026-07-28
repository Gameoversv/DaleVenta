package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.sale.domain.PaymentMethod;

import java.math.BigDecimal;

public record PaymentMethodReportItem(
        PaymentMethod method,
        @JsonProperty("paymentsCount") long paymentsCount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount
) {}
