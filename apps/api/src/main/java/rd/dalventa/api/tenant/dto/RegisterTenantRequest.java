package rd.dalventa.api.tenant.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterTenantRequest(
        @NotBlank String tenantName,
        @NotBlank String adminName,
        @NotBlank @Email String adminEmail,
        @NotBlank @Size(min = 8) String adminPassword,
        String phone,
        String city,
        String rnc,
        /**
         * Honeypot field. Must stay blank; hidden from real users via CSS on the client form.
         * Bots that auto-fill every field will populate it, which we treat as a spam signal.
         */
        String website
) {}
