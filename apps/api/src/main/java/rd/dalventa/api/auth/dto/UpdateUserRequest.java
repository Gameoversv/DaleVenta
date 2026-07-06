package rd.dalventa.api.auth.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.auth.domain.RoleName;

public record UpdateUserRequest(
        @NotNull RoleName role,
        @NotNull Boolean active
) {}
