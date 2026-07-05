package rd.dalventa.api.shared.ratelimit;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration for the in-memory, per-instance rate limiter used on public auth endpoints
 * (login, register, portal login). Backed by bucket4j token buckets held in a ConcurrentHashMap.
 * <p>
 * NOTE: this is intentionally in-memory and per-JVM-instance. It is adequate for a single API
 * instance. If the API is ever scaled horizontally (multiple instances behind a load balancer),
 * this must be replaced with a shared/distributed bucket store (e.g. bucket4j-redis) so limits
 * are enforced consistently across instances.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    /** Master switch. Disabled in the "test" profile to avoid throttling integration tests. */
    private boolean enabled = true;

    private Limit ip = new Limit(20, 1);
    private Limit login = new Limit(5, 1);
    private Limit register = new Limit(5, 1);
    private Limit portalLogin = new Limit(5, 1);

    @Getter
    @Setter
    public static class Limit {
        /** Max attempts allowed within the refill window. */
        private int capacity;
        /** Window size, in minutes, over which the bucket fully refills. */
        private int refillMinutes;

        public Limit() {
        }

        public Limit(int capacity, int refillMinutes) {
            this.capacity = capacity;
            this.refillMinutes = refillMinutes;
        }
    }
}
