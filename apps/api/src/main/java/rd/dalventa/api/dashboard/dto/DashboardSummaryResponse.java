package rd.dalventa.api.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        @JsonProperty("salesToday") long salesToday,
        @JsonProperty("revenueToday") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal revenueToday,
        @JsonProperty("openCashShifts") long openCashShifts,
        @JsonProperty("lowStockItems") long lowStockItems,
        @JsonProperty("activeCustomers") long activeCustomers,
        @JsonProperty("accountsReceivable") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal accountsReceivable
) {}
