package rd.dalventa.api.dashboard.dto;

public record DashboardSummaryResponse(
        long vehiculosEnTaller,
        long vehiculosListos,
        long ordenesAbiertas,
        long ordenesCompletadasHoy,
        long totalClientes,
        long totalVehiculos
) {}
