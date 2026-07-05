package rd.dalventa.api.shared.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Coarse, per-IP defense-in-depth throttle applied to public auth endpoints, ahead of the
 * per-account limits enforced in the controllers. Runs before Spring Security's filter chain so
 * abusive callers are rejected as cheaply as possible.
 * <p>
 * In-memory only (see {@link RateLimiterService}); revisit with a distributed store if this API
 * is ever scaled to multiple instances behind a load balancer.
 */
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties rateLimitProperties;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        if (!rateLimitProperties.isEnabled()) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = ClientIpResolver.resolve(request);
        String key = "ip:" + ip;
        if (!rateLimiterService.tryConsume(key, rateLimitProperties.getIp())) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"success\":false,\"error\":\"Demasiadas solicitudes. Intenta de nuevo mas tarde.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }
}
