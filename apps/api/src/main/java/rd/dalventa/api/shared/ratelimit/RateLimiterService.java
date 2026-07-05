package rd.dalventa.api.shared.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory token-bucket rate limiter keyed by an arbitrary string (IP, IP+account, etc).
 * <p>
 * Buckets are held in a {@link ConcurrentHashMap} for the lifetime of the JVM. This is sufficient
 * for a single API instance. For multi-instance deployments, replace with a distributed backend
 * (e.g. bucket4j-redis) so all instances share the same counters.
 */
@Component
@RequiredArgsConstructor
public class RateLimiterService {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public boolean tryConsume(String key, RateLimitProperties.Limit limit) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket(limit));
        return bucket.tryConsume(1);
    }

    private Bucket newBucket(RateLimitProperties.Limit limit) {
        Duration window = Duration.ofMinutes(Math.max(1, limit.getRefillMinutes()));
        Bandwidth bandwidth = Bandwidth.classic(limit.getCapacity(), Refill.greedy(limit.getCapacity(), window));
        return Bucket.builder().addLimit(bandwidth).build();
    }
}
