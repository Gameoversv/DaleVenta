package rd.dalventa.api.tenant.dto;

import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantPlan;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.util.UUID;

public record TenantResponse(
        UUID id,
        String name,
        String slug,
        TenantPlan plan,
        TenantStatus status
) {
    public static TenantResponse from(Tenant t) {
        return new TenantResponse(t.getId(), t.getName(), t.getSlug(), t.getPlan(), t.getStatus());
    }
}
