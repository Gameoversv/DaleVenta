package rd.dalventa.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SetUserPasswordRequest(
        @JsonProperty("newPassword")
        @NotBlank @Size(min = 8, message = "La contrasena debe tener al menos 8 caracteres") String newPassword
) {}
