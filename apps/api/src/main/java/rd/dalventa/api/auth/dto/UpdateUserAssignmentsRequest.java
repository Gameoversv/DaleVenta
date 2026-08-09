package rd.dalventa.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record UpdateUserAssignmentsRequest(
        @JsonProperty("branchIds") @NotNull List<@NotNull UUID> branchIds,
        @JsonProperty("registerIds") @NotNull List<@NotNull UUID> registerIds
) {
}
