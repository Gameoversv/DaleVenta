package rd.dalventa.api.register.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.register.domain.Register;

import java.util.UUID;

public record RegisterResponse(
        UUID id,
        String name,
        @JsonProperty("branchId") UUID branchId,
        boolean active
) {
    public static RegisterResponse from(Register r) {
        return new RegisterResponse(r.getId(), r.getName(), r.getBranchId(), r.isActive());
    }
}
