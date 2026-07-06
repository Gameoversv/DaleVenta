package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record SalesReportResponse(
        LocalDate from,
        LocalDate to,
        long totalSales,
        long completedSales,
        long voidedSales,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal grossRevenue,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal averageTicket,
        List<PaymentMethodReportItem> payments,
        List<TopProductReportItem> topProducts,
        List<DailySalesReportItem> dailySales
) {}
