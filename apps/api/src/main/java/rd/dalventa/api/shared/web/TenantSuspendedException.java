package rd.dalventa.api.shared.web;

/**
 * Thrown when a user's tenant (taller) is SUSPENDED or CANCELLED and therefore
 * must be denied application access. Mapped to HTTP 403 by GlobalExceptionHandler.
 */
public class TenantSuspendedException extends RuntimeException {

    public TenantSuspendedException(String message) {
        super(message);
    }
}
