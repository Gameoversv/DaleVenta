package rd.dalventa.api.permission.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;

public record UserPermissionRow(
        PermissionCode code,
        @JsonProperty("fromRole") boolean fromRole,
        PermissionEffect override,
        boolean effective) {
}
