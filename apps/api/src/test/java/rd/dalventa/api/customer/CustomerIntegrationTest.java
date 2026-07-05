package rd.dalventa.api.customer;

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
import rd.dalventa.api.customer.dto.CreateCustomerRequest;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CustomerIntegrationTest extends IntegrationTestBase {

    private String token;

    @BeforeEach
    void setup() throws Exception {
        cleanAll();
        token = registerTenantAndGetToken("admin@taller.rd", "password123");
    }

    @Test
    @DisplayName("POST /api/customers - creates customer")
    void create_validRequest_returns201() throws Exception {
        var req = new CreateCustomerRequest("Juan", "Perez", "8091234567", "8091234567",
                "juan@mail.com", "Calle 1, Santo Domingo", "00100100100");

        mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.full_name").value("Juan Perez"))
                .andExpect(jsonPath("$.data.document_id").value("00100100100"));
    }

    @Test
    @DisplayName("GET /api/customers - returns paginated list")
    void list_returnsPage() throws Exception {
        createCustomer("Maria", "Lopez", "00200200200");
        createCustomer("Carlos", "Diaz", "00300300300");

        mockMvc.perform(get("/api/customers")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.meta.total").value(2));
    }

    @Test
    @DisplayName("GET /api/customers?q=lopez - filters by name")
    void list_search_filtersResults() throws Exception {
        createCustomer("Maria", "Lopez", "00200200200");
        createCustomer("Carlos", "Diaz", "00300300300");

        mockMvc.perform(get("/api/customers?q=lopez")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].last_name").value("Lopez"));
    }

    @Test
    @DisplayName("GET /api/customers/:id - returns customer")
    void getById_existing_returnsCustomer() throws Exception {
        var id = createCustomer("Ana", "Marte", "00400400400");

        mockMvc.perform(get("/api/customers/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.first_name").value("Ana"));
    }

    @Test
    @DisplayName("GET /api/customers/:id - returns 404 for unknown id")
    void getById_missing_returns404() throws Exception {
        mockMvc.perform(get("/api/customers/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/customers/:id - updates customer")
    void update_existing_returnsUpdated() throws Exception {
        var id = createCustomer("Pedro", "Gil", "00500500500");

        mockMvc.perform(put("/api/customers/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"8099999999\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.phone").value("8099999999"));
    }

    @Test
    @DisplayName("DELETE /api/customers/:id - soft deletes customer")
    void delete_existing_returns204() throws Exception {
        var id = createCustomer("Luis", "Reyes", "00600600600");

        mockMvc.perform(delete("/api/customers/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/customers/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/customers - 401 without token")
    void create_noToken_returns401() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    private String createCustomer(String first, String last, String doc) throws Exception {
        var req = new CreateCustomerRequest(first, last, null, null, null, null, doc);
        var res = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }
}
