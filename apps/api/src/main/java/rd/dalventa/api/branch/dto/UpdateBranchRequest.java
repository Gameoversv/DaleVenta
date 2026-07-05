package rd.dalventa.api.branch.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateBranchRequest(
        @NotBlank String name,
        String address
) {}
