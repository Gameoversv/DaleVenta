package rd.dalventa.api.shared.web;

/**
 * Thrown when a user is not allowed to change their own password (taller OWNERs
 * must go through a super-admin reset). Mapped to HTTP 403.
 */
public class PasswordChangeNotAllowedException extends RuntimeException {

    public PasswordChangeNotAllowedException(String message) {
        super(message);
    }
}
