package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Jackson is configured globally for SNAKE_CASE, so every multi-word component needs an explicit
 * name or it reaches the client as `gross_revenue` while the web app reads `grossRevenue` — which
 * is exactly how every metric on the sales report silently rendered as zero.
 */
public record SalesReportResponse(
        LocalDate from,
        LocalDate to,
        @JsonProperty("totalSales") long totalSales,
        @JsonProperty("completedSales") long completedSales,
        @JsonProperty("voidedSales") long voidedSales,
        @JsonProperty("grossRevenue") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal grossRevenue,
        @JsonProperty("discountTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("averageTicket") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal averageTicket,
        List<PaymentMethodReportItem> payments,
        @JsonProperty("topProducts") List<TopProductReportItem> topProducts,
        @JsonProperty("dailySales") List<DailySalesReportItem> dailySales
) {}
