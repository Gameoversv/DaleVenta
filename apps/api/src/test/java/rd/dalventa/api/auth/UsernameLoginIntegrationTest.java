package rd.dalventa.api.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El negocio crea a su cajera como "caja1" y ella entra escribiendo "caja1".
 * La columna sigue guardando un correo, con un dominio reservado.
 */
class UsernameLoginIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "username-admin@dalventa.test";
    private static final String PASSWORD = "Secret123!";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("a user created by username signs in with that username")
    void createByUsername_thenLogin() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, PASSWORD);

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Rosa Cajera\",\"email\":\"caja1\","
                                + "\"password\":\"Secret123!\",\"role\":\"CASHIER\"}"))
                .andExpect(status().isOk())
                // Se guarda con dominio reservado, pero nunca se ensena asi.
                .andExpect(jsonPath("$.data.email").value("caja1"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"caja1\",\"password\":\"Secret123!\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("caja1"));
    }

    @Test
    @DisplayName("the username is case-insensitive, like the address it becomes")
    void login_ignoresCase() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, PASSWORD);
        createCashier(token, "caja2");

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"  CAJA2 \",\"password\":\"Secret123!\"}"))
                .andExpect(status().isOk());
    }

    // El admin del negocio se registro con un correo real: ese login no puede romperse.
    @Test
    @DisplayName("an account created with a real address still signs in with it")
    void realEmailAccount_stillWorks() throws Exception {
        registerTenantAndGetToken(ADMIN, PASSWORD);

        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"" + ADMIN + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.email").value(ADMIN));
    }

    @Test
    @DisplayName("the same username cannot be taken twice")
    void duplicateUsername_isRejected() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, PASSWORD);
        createCashier(token, "caja3");

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Otra\",\"email\":\"caja3\","
                                + "\"password\":\"Secret123!\",\"role\":\"CASHIER\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("the reserved domain cannot be claimed by hand")
    void reservedDomain_isRejectedOnCreate() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, PASSWORD);

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Colada\",\"email\":\"caja9@daleventa.invalid\","
                                + "\"password\":\"Secret123!\",\"role\":\"CASHIER\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a username with a space is refused instead of becoming a broken address")
    void usernameWithSpace_isRejected() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, PASSWORD);

        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Espacio\",\"email\":\"caja 4\","
                                + "\"password\":\"Secret123!\",\"role\":\"CASHIER\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a bad username at login reads as bad credentials, not as a validation error")
    void malformedLogin_is401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("{\"email\":\"caja 1\",\"password\":\"Secret123!\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("the staff list shows usernames, never the reserved domain")
    void userList_showsUsernames() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, PASSWORD);
        createCashier(token, "caja5");

        mockMvc.perform(get("/api/users").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.email=='caja5')]").exists())
                .andExpect(jsonPath("$.data[?(@.email=~/.*daleventa\\.invalid/)]").doesNotExist());
    }

    private void createCashier(String token, String username) throws Exception {
        mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Cajera " + username + "\",\"email\":\"" + username + "\","
                                + "\"password\":\"Secret123!\",\"role\":\"CASHIER\"}"))
                .andExpect(status().isOk());
    }
}
