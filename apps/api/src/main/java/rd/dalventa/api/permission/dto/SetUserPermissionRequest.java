package rd.dalventa.api.permission.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.permission.domain.PermissionEffect;

public record SetUserPermissionRequest(@NotNull PermissionEffect effect) {
}
