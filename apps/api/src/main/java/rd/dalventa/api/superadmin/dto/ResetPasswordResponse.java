package rd.dalventa.api.superadmin.dto;

/** One-time temporary password issued by a super-admin password reset. */
public record ResetPasswordResponse(String temporaryPassword) {
}
