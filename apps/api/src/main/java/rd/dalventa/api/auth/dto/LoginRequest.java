package rd.dalventa.api.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        // Acepta un usuario ("caja1") o un correo: LoginIdentifier resuelve ambos.
        @NotBlank(message = "El usuario es requerido")
        String email,

        @NotBlank(message = "La contrasena es requerida")
        String password
) {}
