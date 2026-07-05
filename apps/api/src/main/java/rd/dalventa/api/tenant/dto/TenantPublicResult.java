package rd.dalventa.api.tenant.dto;

import rd.dalventa.api.tenant.domain.Tenant;

public record TenantPublicResult(String name, String slug, String city) {
    public static TenantPublicResult from(Tenant t) {
        return new TenantPublicResult(t.getName(), t.getSlug(), t.getCity());
    }
}
