package rd.dalventa.api.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import rd.dalventa.api.auth.domain.RoleName;

public record RegisterRequest(
        @NotBlank(message = "El nombre es requerido")
        String name,

        @NotBlank(message = "El correo es requerido")
        @Email(message = "Correo invalido")
        String email,

        @NotBlank(message = "La contrasena es requerida")
        @Size(min = 8, message = "La contrasena debe tener al menos 8 caracteres")
        String password,

        RoleName role
) {}
