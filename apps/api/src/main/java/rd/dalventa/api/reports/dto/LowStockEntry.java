package rd.dalventa.api.reports.dto;

public record LowStockEntry(String internalCode, String description, int currentStock, int minStock) {}
