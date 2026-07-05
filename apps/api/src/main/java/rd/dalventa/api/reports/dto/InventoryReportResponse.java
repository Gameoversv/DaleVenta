package rd.dalventa.api.reports.dto;

import java.math.BigDecimal;
import java.util.List;

public record InventoryReportResponse(
        BigDecimal totalInventoryValue,
        long totalProducts,
        long lowStockCount,
        List<TopProductEntry> topUsedParts,
        List<LowStockEntry> lowStockItems
) {}
