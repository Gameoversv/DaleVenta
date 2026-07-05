package rd.dalventa.api.register.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateRegisterRequest(
        @NotBlank String name,
        @JsonProperty("branchId") @NotNull UUID branchId
) {}
