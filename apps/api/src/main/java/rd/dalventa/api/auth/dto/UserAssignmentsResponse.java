package rd.dalventa.api.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

public record UserAssignmentsResponse(
        @JsonProperty("branchIds") List<UUID> branchIds,
        @JsonProperty("registerIds") List<UUID> registerIds
) {
}
