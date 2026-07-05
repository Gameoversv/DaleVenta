package rd.dalventa.api.superadmin.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.tenant.domain.TenantPlan;

public record UpdateTenantPlanRequest(@NotNull TenantPlan plan) {}
