package rd.dalventa.api.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.shared.config.AppProperties;
import rd.dalventa.api.support.IntegrationTestBase;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authentication, authorization and transport-level hardening checks that apply to the API as a
 * whole rather than to any single business module.
 */
class ApiSecurityIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "security-admin@dalventa.test";
    private static final String CASHIER = "security-cashier@dalventa.test";

    @Autowired
    private AppProperties appProperties;

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @ParameterizedTest(name = "{0} requires authentication")
    @ValueSource(strings = {
            "/api/users",
            "/api/products",
            "/api/customers",
            "/api/branches",
            "/api/registers",
            "/api/purchases",
            "/api/suppliers",
            "/api/quotations",
            "/api/rentals",
            "/api/dashboard/summary",
            "/api/search",
            "/api/settings/invoice",
            "/api/audit-logs",
            "/api/fiscal/status"
    })
    @DisplayName("protected endpoints reject anonymous callers")
    void protectedEndpoints_withoutToken_return401(String url) throws Exception {
        mockMvc.perform(get(url))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("a malformed, tampered, foreign-signed or expired token is never accepted")
    void invalidTokens_areRejected() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        expectUnauthorized("not-a-jwt");
        expectUnauthorized(tamperSignature(token));
        expectUnauthorized(forgeToken(ADMIN, Instant.now().plus(1, ChronoUnit.HOURS), configuredSecret()
                .replace("test", "xxxx")));
        expectUnauthorized(forgeToken(ADMIN, Instant.now().minus(1, ChronoUnit.MINUTES), configuredSecret()));

        // Control: the untouched token issued by the API still works.
        mockMvc.perform(get("/api/products").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("a role without the permission gets 403, not the data")
    void missingPermission_returnsForbidden() throws Exception {
        var adminToken = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);
        enableAllModules(ADMIN);
        createUser(adminToken, "Cajera", CASHIER, DEFAULT_PASSWORD, RoleName.CASHIER);
        var cashierToken = login(CASHIER, DEFAULT_PASSWORD);

        // CASHIER is seeded with the POS-floor subset only: no user admin, reports or purchasing.
        expectForbidden(cashierToken, "/api/users");
        expectForbidden(cashierToken, "/api/reports/sales?from=2026-01-01&to=2026-01-31");
        expectForbidden(cashierToken, "/api/purchases");
        expectForbidden(cashierToken, "/api/purchases/accounts-payable");
        expectForbidden(cashierToken, "/api/settings/invoice");
    }

    @Test
    @DisplayName("a REVOKE override beats the permission the role grants")
    void revokeOverride_blocksRolePermission() throws Exception {
        var adminToken = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);
        var cashierId = createUser(adminToken, "Cajera", CASHIER, DEFAULT_PASSWORD, RoleName.CASHIER);
        var cashierToken = login(CASHIER, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/customers").header("Authorization", bearer(cashierToken)))
                .andExpect(status().isOk());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/users/" + cashierId + "/permissions/CUSTOMER_VIEW")
                        .header("Authorization", bearer(adminToken))
                        .contentType("application/json")
                        .content("{\"effect\":\"REVOKE\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/customers").header("Authorization", bearer(cashierToken)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("CORS preflight only succeeds for a configured origin")
    void corsPreflight_rejectsUnknownOrigin() throws Exception {
        mockMvc.perform(options("/api/products")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));

        mockMvc.perform(options("/api/products")
                        .header("Origin", "https://attacker.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("SQL metacharacters in the search query are treated as text, not SQL")
    void globalSearch_isNotSqlInjectable() throws Exception {
        var fixture = provisionTenant(ADMIN);

        for (String payload : new String[]{
                "'; DROP TABLE products; --",
                "' OR '1'='1",
                "%' UNION SELECT null,null,null --"
        }) {
            mockMvc.perform(get("/api/search").param("q", payload)
                            .header("Authorization", bearer(fixture.token())))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.results.length()").value(0));
        }

        // The catalog survived: the payloads never reached the database as SQL.
        mockMvc.perform(get("/api/products").header("Authorization", bearer(fixture.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("error responses do not leak stack traces or SQL details")
    void errorResponses_areGeneric() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        var body = mockMvc.perform(get("/api/customers/" + java.util.UUID.randomUUID())
                        .header("Authorization", bearer(token)))
                .andExpect(status().isNotFound())
                .andReturn().getResponse().getContentAsString();

        if (body.contains("Exception") || body.contains("org.springframework") || body.contains("SQL")) {
            throw new AssertionError("Error payload leaked internals: " + body);
        }
    }

    @Test
    @DisplayName("login with a wrong password never reveals whether the email exists")
    void loginFailure_doesNotEnumerateAccounts() throws Exception {
        registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        var existing = loginError(ADMIN, "WrongPassword1!");
        var missing = loginError("nobody@dalventa.test", "WrongPassword1!");

        if (!existing.equals(missing)) {
            throw new AssertionError("Login errors differ between existing and unknown accounts: '"
                    + existing + "' vs '" + missing + "'");
        }
    }

    private String loginError(String email, String password) throws Exception {
        var res = mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("error").asText();
    }

    private void expectUnauthorized(String token) throws Exception {
        mockMvc.perform(get("/api/products").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    private void expectForbidden(String token, String url) throws Exception {
        mockMvc.perform(get(url).header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    private String configuredSecret() {
        return appProperties.getJwt().getSecret();
    }

    /**
     * Alters one signature character so the payload stays valid but the HMAC does not.
     *
     * Deliberately not the last character: a 256-bit HMAC is 43 base64url characters, and the
     * final one carries only two significant bits, so four different characters there decode to
     * the very same 32 bytes. Flipping it left the signature equivalent often enough to make this
     * test fail intermittently — and the failure looked like the API accepting a forged token.
     * Every bit of a middle character counts.
     */
    private String tamperSignature(String token) {
        int signatureStart = token.lastIndexOf('.') + 1;
        int target = signatureStart + (token.length() - signatureStart) / 2;
        char current = token.charAt(target);
        char replacement = current == 'A' ? 'B' : 'A';
        return token.substring(0, target) + replacement + token.substring(target + 1);
    }

    private String forgeToken(String email, Instant expiry, String secret) {
        SecretKey key = Keys.hmacShaKeyFor(padTo32Bytes(secret));
        return Jwts.builder()
                .subject(java.util.UUID.randomUUID().toString())
                .claim("email", email)
                .issuedAt(Date.from(expiry.minus(2, ChronoUnit.HOURS)))
                .expiration(Date.from(expiry))
                .signWith(key)
                .compact();
    }

    private byte[] padTo32Bytes(String secret) {
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length >= 32) {
            return raw;
        }
        byte[] padded = new byte[32];
        System.arraycopy(raw, 0, padded, 0, raw.length);
        return padded;
    }
}
