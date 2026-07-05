package rd.dalventa.api.shared.ratelimit;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimiterServiceTest {

    @Test
    @DisplayName("tryConsume allows up to capacity attempts then rejects")
    void tryConsume_exceedsCapacity_rejectsFurtherAttempts() {
        var service = new RateLimiterService();
        var limit = new RateLimitProperties.Limit(3, 1);

        assertThat(service.tryConsume("key-1", limit)).isTrue();
        assertThat(service.tryConsume("key-1", limit)).isTrue();
        assertThat(service.tryConsume("key-1", limit)).isTrue();
        assertThat(service.tryConsume("key-1", limit)).isFalse();
    }

    @Test
    @DisplayName("tryConsume tracks separate buckets per key")
    void tryConsume_differentKeys_areIndependent() {
        var service = new RateLimiterService();
        var limit = new RateLimitProperties.Limit(1, 1);

        assertThat(service.tryConsume("key-a", limit)).isTrue();
        assertThat(service.tryConsume("key-a", limit)).isFalse();
        assertThat(service.tryConsume("key-b", limit)).isTrue();
    }
}
