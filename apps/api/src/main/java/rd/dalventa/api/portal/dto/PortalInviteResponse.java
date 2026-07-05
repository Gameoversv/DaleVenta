package rd.dalventa.api.portal.dto;

public record PortalInviteResponse(
        String documentId,
        String temporaryPassword,
        String portalUrl
) {}
