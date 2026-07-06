package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ImpersonateResponse(String token, @JsonProperty("tenantName") String tenantName) {}
