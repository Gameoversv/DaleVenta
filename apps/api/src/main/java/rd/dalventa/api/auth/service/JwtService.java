package rd.dalventa.api.auth.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.shared.config.AppProperties;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final AppProperties properties;

    public String generateToken(User user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(properties.getJwt().getExpirationHours(), ChronoUnit.HOURS);

        var builder = Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .claim("role", user.getPrimaryRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry));

        if (user.getTenantId() != null) {
            builder.claim("tenantId", user.getTenantId().toString());
        }

        return builder.signWith(getSigningKey()).compact();
    }

    public String generatePortalToken(User user, java.util.UUID customerId) {
        Instant now = Instant.now();
        Instant expiry = now.plus(properties.getJwt().getExpirationHours(), ChronoUnit.HOURS);

        return Jwts.builder()
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("name", user.getName())
                .claim("role", "CLIENT")
                .claim("tenantId", user.getTenantId().toString())
                .claim("customerId", customerId.toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(getSigningKey())
                .compact();
    }

    public java.util.UUID extractCustomerId(String token) {
        String raw = getClaims(token).get("customerId", String.class);
        return raw != null ? java.util.UUID.fromString(raw) : null;
    }

    public java.util.UUID extractTenantId(String token) {
        String raw = getClaims(token).get("tenantId", String.class);
        return raw != null ? java.util.UUID.fromString(raw) : null;
    }

    public String extractEmail(String token) {
        return getClaims(token).get("email", String.class);
    }

    public boolean isTokenValid(String token, String email) {
        try {
            Claims claims = getClaims(token);
            return email.equals(claims.get("email", String.class))
                    && claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey getSigningKey() {
        byte[] secretBytes = properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length >= 32) {
            return Keys.hmacShaKeyFor(secretBytes);
        }
        try {
            byte[] derivedKey = MessageDigest.getInstance("SHA-256").digest(secretBytes);
            return new SecretKeySpec(derivedKey, "HmacSHA256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no esta disponible para firmar JWT", e);
        }
    }
}
