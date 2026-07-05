package rd.dalventa.api.auth.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import rd.dalventa.api.shared.config.AppProperties;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;

class CorsConfigValidatorTest {

    @Test
    @DisplayName("throws when prod profile still uses the localhost CORS default")
    void validate_prodProfileWithLocalhostDefault_throws() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});
        AppProperties properties = new AppProperties();
        properties.getCors().setAllowedOrigins("http://localhost:3000");

        var validator = new CorsConfigValidator(env, properties);

        assertThatThrownBy(validator::validate).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("does not throw when prod profile has a real origin configured")
    void validate_prodProfileWithRealOrigin_doesNotThrow() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"prod"});
        AppProperties properties = new AppProperties();
        properties.getCors().setAllowedOrigins("https://app.tallerfacil.rd");

        var validator = new CorsConfigValidator(env, properties);

        assertThatNoException().isThrownBy(validator::validate);
    }

    @Test
    @DisplayName("does not throw outside of a production profile")
    void validate_nonProdProfile_doesNotThrow() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[]{"test"});
        AppProperties properties = new AppProperties();
        properties.getCors().setAllowedOrigins("http://localhost:3000");

        var validator = new CorsConfigValidator(env, properties);

        assertThatNoException().isThrownBy(validator::validate);
    }
}
