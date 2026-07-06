package rd.dalventa.api.permission.dto;

import rd.dalventa.api.permission.domain.PermissionCode;
import rd.dalventa.api.permission.domain.PermissionEffect;

public record UserPermissionRow(
        PermissionCode code,
        boolean fromRole,
        PermissionEffect override,
        boolean effective) {
}
