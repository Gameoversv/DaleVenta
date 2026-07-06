package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GlobalStatsResponse(
        @JsonProperty("tenantsTotal") long tenantsTotal,
        @JsonProperty("tenantsPending") long tenantsPending,
        @JsonProperty("tenantsTrial") long tenantsTrial,
        @JsonProperty("tenantsActive") long tenantsActive,
        @JsonProperty("tenantsSuspended") long tenantsSuspended,
        @JsonProperty("tenantsCancelled") long tenantsCancelled,
        @JsonProperty("usersTotal") long usersTotal,
        @JsonProperty("customersTotal") long customersTotal
) {}
