package rd.dalventa.api.reports.dto;

import java.math.BigDecimal;

public record TopProductEntry(String description, long timesUsed, BigDecimal totalAmount) {}
