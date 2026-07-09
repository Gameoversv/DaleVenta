package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public record UpdateTenantRentalModuleRequest(
        @JsonProperty("enabled") @NotNull Boolean enabled
) {
}
