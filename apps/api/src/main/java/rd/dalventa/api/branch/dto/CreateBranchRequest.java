package rd.dalventa.api.branch.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateBranchRequest(
        @NotBlank String name,
        String address
) {}
