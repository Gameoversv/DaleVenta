package rd.dalventa.api.shared.web;

/** Thrown when a caller exceeds the allowed rate on a rate-limited endpoint. */
public class RateLimitExceededException extends RuntimeException {

    public RateLimitExceededException(String message) {
        super(message);
    }
}
