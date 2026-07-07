package rd.dalventa.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.tenant.domain.Tenant;

public record TenantFeaturesResponse(@JsonProperty("fiscalModuleEnabled") boolean fiscalModuleEnabled) {
    public static TenantFeaturesResponse disabled() {
        return new TenantFeaturesResponse(false);
    }

    public static TenantFeaturesResponse from(Tenant tenant) {
        return new TenantFeaturesResponse(tenant.isFiscalModuleEnabled());
    }
}
