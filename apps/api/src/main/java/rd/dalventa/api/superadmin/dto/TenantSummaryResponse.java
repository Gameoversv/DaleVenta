package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantPlan;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.time.Instant;
import java.util.UUID;

public record TenantSummaryResponse(
        UUID id,
        String name,
        String slug,
        TenantPlan plan,
        TenantStatus status,
        @JsonProperty("fiscalModuleEnabled") boolean fiscalModuleEnabled,
        @JsonProperty("trialEndsAt") Instant trialEndsAt,
        @JsonProperty("createdAt") Instant createdAt,
        @JsonProperty("userCount") long userCount,
        @JsonProperty("customerCount") long customerCount
) {
    public static TenantSummaryResponse of(Tenant t, long users, long customers) {
        return new TenantSummaryResponse(
                t.getId(), t.getName(), t.getSlug(),
                t.getPlan(), t.getStatus(), t.isFiscalModuleEnabled(), t.getTrialEndsAt(), t.getCreatedAt(),
                users, customers
        );
    }
}
