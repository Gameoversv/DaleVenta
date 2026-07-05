package rd.dalventa.api.announcement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateAnnouncementRequest(
        @NotBlank(message = "El mensaje es requerido")
        @Size(max = 500, message = "Máximo 500 caracteres")
        String message,

        @Pattern(regexp = "INFO|WARNING", message = "Nivel inválido")
        String level,

        boolean active
) {
}
