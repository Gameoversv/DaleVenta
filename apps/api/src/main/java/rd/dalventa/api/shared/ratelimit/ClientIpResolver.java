package rd.dalventa.api.shared.ratelimit;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolves the originating client IP, honoring the {@code X-Forwarded-For} header when the API
 * sits behind a reverse proxy (nginx/Traefik). Falls back to the direct remote address.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {
    }

    public static String resolve(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
