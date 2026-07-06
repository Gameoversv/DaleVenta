package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.auth.domain.User;

import java.time.Instant;
import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String name,
        String email,
        String role,
        @JsonProperty("tenantId") UUID tenantId,
        boolean active,
        @JsonProperty("createdAt") Instant createdAt
) {
    public static UserSummaryResponse from(User u) {
        return new UserSummaryResponse(
                u.getId(), u.getName(), u.getEmail(),
                u.getPrimaryRole() != null ? u.getPrimaryRole().name() : null,
                u.getTenantId(), u.isActive(), u.getCreatedAt()
        );
    }
}
