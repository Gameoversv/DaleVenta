package rd.dalventa.api.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public record SalesSummaryResponse(
        BigDecimal totalRevenue,
        BigDecimal previousRevenue,
        long totalInvoices,
        BigDecimal avgTicket,
        long completedWorkOrders,
        List<SalesTrendEntry> trend
) {}
