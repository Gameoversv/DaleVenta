package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.tenant.domain.Tenant;

import java.time.Instant;
import java.util.UUID;

public record ExpiringTenantResponse(UUID id, String name, String slug, @JsonProperty("trialEndsAt") Instant trialEndsAt) {
    public static ExpiringTenantResponse from(Tenant t) {
        return new ExpiringTenantResponse(t.getId(), t.getName(), t.getSlug(), t.getTrialEndsAt());
    }
}
