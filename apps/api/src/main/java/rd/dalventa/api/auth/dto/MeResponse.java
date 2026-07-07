package rd.dalventa.api.auth.dto;

import rd.dalventa.api.permission.domain.PermissionCode;

import java.util.List;

public record MeResponse(UserResponse user, List<PermissionCode> permissions, TenantFeaturesResponse tenantFeatures) {}
