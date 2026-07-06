package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.sale.domain.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DailyCloseReportResponse(
        LocalDate date,
        String registerName,
        long completedSales,
        long voidedSales,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal grossRevenue,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashExpected,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashCounted,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference,
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
            String openedAt,
            String closedAt,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal expectedCash,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal countedCash,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference
    ) {}
}
