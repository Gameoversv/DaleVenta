package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public record UpdateTenantFiscalModuleRequest(@NotNull @JsonProperty("enabled") Boolean enabled) {}
