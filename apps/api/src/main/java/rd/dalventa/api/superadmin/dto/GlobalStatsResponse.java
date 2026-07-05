package rd.dalventa.api.superadmin.dto;

public record GlobalStatsResponse(
        long tenantsTotal,
        long tenantsPending,
        long tenantsTrial,
        long tenantsActive,
        long tenantsSuspended,
        long tenantsCancelled,
        long usersTotal,
        long customersTotal
) {}
