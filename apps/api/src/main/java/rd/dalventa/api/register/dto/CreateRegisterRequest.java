package rd.dalventa.api.register.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record CreateRegisterRequest(
        @NotBlank String name,
        @JsonProperty("branchId")
        @NotBlank String branchId
) {}
