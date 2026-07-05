package rd.dalventa.api.auth.web;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import rd.dalventa.api.shared.config.AppProperties;

import java.util.List;
import java.util.Set;

/**
 * Fails application startup if running under a production profile with CORS still pointed at the
 * localhost development default. Prevents accidentally shipping a prod deployment that only
 * accepts requests from http://localhost:3000 (or, worse, being left permissive by mistake).
 */
@Component
@RequiredArgsConstructor
public class CorsConfigValidator {

    private static final Set<String> PROD_PROFILES = Set.of("prod", "production");
    private static final String LOCALHOST_DEFAULT = "http://localhost:3000";

    private final Environment environment;
    private final AppProperties properties;

    @PostConstruct
    public void validate() {
        boolean isProd = List.of(environment.getActiveProfiles()).stream()
                .map(String::toLowerCase)
                .anyMatch(PROD_PROFILES::contains);

        if (!isProd) {
            return;
        }

        String allowedOrigins = properties.getCors().getAllowedOrigins();
        boolean isStillLocalhostDefault = allowedOrigins == null
                || allowedOrigins.isBlank()
                || allowedOrigins.trim().equals(LOCALHOST_DEFAULT);

        if (isStillLocalhostDefault) {
            throw new IllegalStateException(
                    "CORS_ALLOWED_ORIGINS is not configured for the production profile "
                            + "(still defaulting to " + LOCALHOST_DEFAULT + "). "
                            + "Set the CORS_ALLOWED_ORIGINS environment variable to your real "
                            + "production origin(s) before starting the application.");
        }
    }
}
