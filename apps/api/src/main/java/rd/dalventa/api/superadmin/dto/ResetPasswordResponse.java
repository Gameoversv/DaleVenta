package rd.dalventa.api.superadmin.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/** One-time temporary password issued by a super-admin password reset. */
public record ResetPasswordResponse(@JsonProperty("temporaryPassword") String temporaryPassword) {
}
