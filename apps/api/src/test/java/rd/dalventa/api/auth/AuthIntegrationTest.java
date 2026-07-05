package rd.dalventa.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.dto.LoginRequest;
import rd.dalventa.api.auth.dto.RegisterRequest;
import rd.dalventa.api.auth.repository.UserRepository;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void cleanUsers() {
        userRepository.deleteAll();
    }

    @Test
    @DisplayName("POST /api/auth/register - creates user and returns token")
    void register_validRequest_returnsToken() throws Exception {
        var request = new RegisterRequest("Maria Lopez", "maria@taller.rd", "password123", RoleName.OWNER);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.user.email").value("maria@taller.rd"))
                .andExpect(jsonPath("$.data.user.role").value("OWNER"));
    }

    @Test
    @DisplayName("POST /api/auth/login - returns token for valid credentials")
    void login_validCredentials_returnsToken() throws Exception {
        var register = new RegisterRequest("Carlos Diaz", "carlos@taller.rd", "password123", RoleName.MECHANIC);
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)));

        var login = new LoginRequest("carlos@taller.rd", "password123");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/auth/login - returns 401 for wrong password")
    void login_wrongPassword_returns401() throws Exception {
        var register = new RegisterRequest("Pedro Gil", "pedro@taller.rd", "password123", RoleName.CLIENT);
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(register)));

        var login = new LoginRequest("pedro@taller.rd", "wrong");
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(login)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/users/me - returns 401 without token")
    void me_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/users/me - returns user data with valid token")
    void me_validToken_returnsUser() throws Exception {
        var register = new RegisterRequest("Ana Marte", "ana@taller.rd", "password123", RoleName.MANAGER);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(register)))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        String token = objectMapper.readTree(body).path("data").path("token").asText();

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("ana@taller.rd"))
                .andExpect(jsonPath("$.data.role").value("MANAGER"));
    }

    @Test
    @DisplayName("POST /api/auth/register - returns 400 for duplicate email")
    void register_duplicateEmail_returns400() throws Exception {
        var request = new RegisterRequest("Luis Perez", "luis@taller.rd", "password123", RoleName.CLIENT);
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
