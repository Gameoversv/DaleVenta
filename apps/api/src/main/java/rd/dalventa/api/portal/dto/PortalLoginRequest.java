package rd.dalventa.api.portal.dto;

public record PortalLoginRequest(
        String tenantSlug,
        String documentId,
        String password,
        /**
         * Honeypot field. Must stay blank; hidden from real users via CSS on the client form.
         * Bots that auto-fill every field will populate it, which we treat as a spam signal.
         */
        String website
) {}
