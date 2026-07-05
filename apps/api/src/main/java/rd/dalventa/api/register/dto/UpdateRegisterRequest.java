package rd.dalventa.api.register.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateRegisterRequest(
        @NotBlank String name
) {}
