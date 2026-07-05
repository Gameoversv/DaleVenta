package rd.dalventa.api.shared.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Registers {@link RateLimitFilter} only for the public auth endpoints that are exposed to
 * unauthenticated/abuse-prone traffic, running ahead of Spring Security's own filter chain.
 */
@Configuration
@RequiredArgsConstructor
public class RateLimitFilterConfig {

    private final RateLimitFilter rateLimitFilter;

    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration() {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(rateLimitFilter);
        registration.addUrlPatterns(
                "/api/auth/login",
                "/api/auth/register",
                "/api/tenants/register",
                "/api/portal/auth/login"
        );
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}
