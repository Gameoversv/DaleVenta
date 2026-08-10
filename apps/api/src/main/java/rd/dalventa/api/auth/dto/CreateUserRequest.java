package rd.dalventa.api.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import rd.dalventa.api.auth.domain.RoleName;

public record CreateUserRequest(
        @NotBlank String name,
        @NotBlank(message = "El usuario es requerido") @Size(max = 255) String email,
        @NotBlank @Size(min = 8) String password,
        @NotNull RoleName role
) {}
