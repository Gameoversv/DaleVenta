package rd.dalventa.api.portal.dto;

public record PortalChangePasswordRequest(
        String currentPassword,
        String newPassword
) {}
