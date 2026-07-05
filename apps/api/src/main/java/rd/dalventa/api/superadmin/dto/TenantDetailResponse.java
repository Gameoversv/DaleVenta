package rd.dalventa.api.superadmin.dto;

import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantPlan;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TenantDetailResponse(
        UUID id,
        String name,
        String slug,
        String city,
        String country,
        String phone,
        String email,
        String rnc,
        TenantPlan plan,
        TenantStatus status,
        Instant trialEndsAt,
        Instant createdAt,
        long userCount,
        long customerCount,
        long vehicleCount,
        long orderCount,
        List<UserSummaryResponse> owners
) {
    public static TenantDetailResponse of(
            Tenant t,
            long users, long customers, long vehicles, long orders,
            List<UserSummaryResponse> owners
    ) {
        return new TenantDetailResponse(
                t.getId(), t.getName(), t.getSlug(),
                t.getCity(), t.getCountry(), t.getPhone(),
                t.getEmail(), t.getRnc(),
                t.getPlan(), t.getStatus(), t.getTrialEndsAt(), t.getCreatedAt(),
                users, customers, vehicles, orders, owners
        );
    }
}
