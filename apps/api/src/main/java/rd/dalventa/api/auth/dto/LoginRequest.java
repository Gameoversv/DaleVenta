package rd.dalventa.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "El correo es requerido")
        @Email(message = "Correo invalido")
        String email,

        @NotBlank(message = "La contrasena es requerida")
        String password
) {}
