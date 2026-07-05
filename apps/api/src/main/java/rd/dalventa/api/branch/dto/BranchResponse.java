package rd.dalventa.api.branch.dto;

import rd.dalventa.api.branch.domain.Branch;

import java.time.Instant;
import java.util.UUID;

public record BranchResponse(
        UUID id,
        String name,
        String address,
        boolean active,
        Instant createdAt
) {
    public static BranchResponse from(Branch b) {
        return new BranchResponse(b.getId(), b.getName(), b.getAddress(), b.isActive(), b.getCreatedAt());
    }
}
