package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.sale.domain.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Multi-word components are named explicitly; see {@link SalesReportResponse} for why. */
public record DailyCloseReportResponse(
        LocalDate date,
        @JsonProperty("registerName") String registerName,
        @JsonProperty("completedSales") long completedSales,
        @JsonProperty("voidedSales") long voidedSales,
        @JsonProperty("grossRevenue") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal grossRevenue,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonProperty("cashExpected") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashExpected,
        @JsonProperty("cashCounted") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashCounted,
        @JsonProperty("cashDifference") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference,
        List<PaymentBreakdown> payments,
        List<ShiftRow> shifts
) {
    public record PaymentBreakdown(
            PaymentMethod method,
            long count,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal amount
    ) {}

    public record ShiftRow(
            String id,
            String status,
            @JsonProperty("openedAt") String openedAt,
            @JsonProperty("closedAt") String closedAt,
            @JsonProperty("expectedCash") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal expectedCash,
            @JsonProperty("countedCash") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal countedCash,
            @JsonProperty("cashDifference") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference
    ) {}
}
