package rd.dalventa.api.superadmin.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.tenant.domain.TenantStatus;

public record UpdateTenantStatusRequest(@NotNull TenantStatus status) {}
