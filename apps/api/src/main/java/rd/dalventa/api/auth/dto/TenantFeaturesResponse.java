package rd.dalventa.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.tenant.domain.Tenant;

public record TenantFeaturesResponse(
        @JsonProperty("fiscalModuleEnabled") boolean fiscalModuleEnabled,
        @JsonProperty("cashDenominationsEnabled") boolean cashDenominationsEnabled,
        @JsonProperty("multiBranchEnabled") boolean multiBranchEnabled,
        @JsonProperty("multiRegisterEnabled") boolean multiRegisterEnabled
) {
    public static TenantFeaturesResponse disabled() {
        return new TenantFeaturesResponse(false, true, false, false);
    }

    public static TenantFeaturesResponse from(Tenant tenant) {
        return new TenantFeaturesResponse(
                tenant.isFiscalModuleEnabled(),
                tenant.isCashDenominationsEnabled(),
                tenant.isMultiBranchEnabled(),
                tenant.isMultiRegisterEnabled()
        );
    }
}
