package rd.dalventa.api.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.service.JwtService;
import rd.dalventa.api.shared.config.AppProperties;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private JwtService jwtService;
    private User testUser;

    @BeforeEach
    void setUp() {
        var properties = new AppProperties();
        properties.getJwt().setSecret("test-secret-key-256-bits-for-unit-testing-purposes-only-here");
        properties.getJwt().setExpirationHours(24);
        jwtService = new JwtService(properties);

        testUser = new User("Juan Perez", "juan@taller.rd", "hashed");
    }

    @Test
    @DisplayName("generateToken produces non-null token")
    void generateToken_validUser_returnsToken() {
        String token = jwtService.generateToken(testUser);
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    @DisplayName("extractEmail returns user email from token")
    void extractEmail_validToken_returnsEmail() {
        String token = jwtService.generateToken(testUser);
        assertThat(jwtService.extractEmail(token)).isEqualTo("juan@taller.rd");
    }

    @Test
    @DisplayName("isTokenValid returns true for valid token and matching email")
    void isTokenValid_matchingEmail_returnsTrue() {
        String token = jwtService.generateToken(testUser);
        assertThat(jwtService.isTokenValid(token, "juan@taller.rd")).isTrue();
    }

    @Test
    @DisplayName("isTokenValid returns false for wrong email")
    void isTokenValid_wrongEmail_returnsFalse() {
        String token = jwtService.generateToken(testUser);
        assertThat(jwtService.isTokenValid(token, "otro@taller.rd")).isFalse();
    }

    @Test
    @DisplayName("isTokenValid returns false for tampered token")
    void isTokenValid_tamperedToken_returnsFalse() {
        String token = jwtService.generateToken(testUser) + "tampered";
        assertThat(jwtService.isTokenValid(token, "juan@taller.rd")).isFalse();
    }
}
