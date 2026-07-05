package rd.dalventa.api.vehicle;

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

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class VehicleIntegrationTest extends IntegrationTestBase {

    private String token;
    private String customerId;

    @BeforeEach
    void setup() throws Exception {
        cleanAll();
        token = registerTenantAndGetToken("admin@taller.rd", "password123");
        customerId = createCustomer("Juan", "Perez", "00100100100");
    }

    @Test
    @DisplayName("POST /api/vehicles - creates vehicle")
    void create_validRequest_returns201() throws Exception {
        var req = buildRequest("Toyota", "Corolla", 2020, "ABC-1234", customerId);

        mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.brand").value("Toyota"))
                .andExpect(jsonPath("$.data.license_plate").value("ABC-1234"))
                .andExpect(jsonPath("$.data.customer_name").value("Juan Perez"));
    }

    @Test
    @DisplayName("GET /api/vehicles - returns paginated list")
    void list_returnsPage() throws Exception {
        createVehicle("Honda", "Civic", 2019, "DEF-5678", customerId);
        createVehicle("Nissan", "Sentra", 2021, "GHI-9012", customerId);

        mockMvc.perform(get("/api/vehicles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.meta.total").value(2));
    }

    @Test
    @DisplayName("GET /api/vehicles?q=civic - filters by model")
    void list_search_byModel() throws Exception {
        createVehicle("Honda", "Civic", 2019, "DEF-5678", customerId);
        createVehicle("Nissan", "Sentra", 2021, "GHI-9012", customerId);

        mockMvc.perform(get("/api/vehicles?q=civic")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(0));
    }

    @Test
    @DisplayName("GET /api/vehicles?q=DEF - filters by license plate")
    void list_search_byLicensePlate() throws Exception {
        createVehicle("Honda", "Civic", 2019, "DEF-5678", customerId);
        createVehicle("Nissan", "Sentra", 2021, "GHI-9012", customerId);

        mockMvc.perform(get("/api/vehicles?q=DEF")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].license_plate").value("DEF-5678"));
    }

    @Test
    @DisplayName("GET /api/vehicles?customerId= - filters by customer")
    void list_filterByCustomer() throws Exception {
        var other = createCustomer("Maria", "Lopez", "00200200200");
        createVehicle("Honda", "Civic", 2019, "DEF-5678", customerId);
        createVehicle("Ford", "F-150", 2022, "JKL-3456", other);

        mockMvc.perform(get("/api/vehicles?customerId=" + customerId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.meta.total").value(1))
                .andExpect(jsonPath("$.data[0].brand").value("Honda"));
    }

    @Test
    @DisplayName("GET /api/vehicles/:id - returns vehicle")
    void getById_existing_returnsVehicle() throws Exception {
        var id = createVehicle("Kia", "Rio", 2018, "MNO-7890", customerId);

        mockMvc.perform(get("/api/vehicles/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.brand").value("Kia"));
    }

    @Test
    @DisplayName("GET /api/vehicles/:id - 404 for unknown id")
    void getById_missing_returns404() throws Exception {
        mockMvc.perform(get("/api/vehicles/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PUT /api/vehicles/:id - updates vehicle")
    void update_existing_returnsUpdated() throws Exception {
        var id = createVehicle("Hyundai", "Accent", 2017, "PQR-1122", customerId);

        mockMvc.perform(put("/api/vehicles/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mileage\":50000}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mileage").value(50000));
    }

    @Test
    @DisplayName("DELETE /api/vehicles/:id - soft deletes vehicle")
    void delete_existing_returns204() throws Exception {
        var id = createVehicle("Chevrolet", "Spark", 2016, "STU-3344", customerId);

        mockMvc.perform(delete("/api/vehicles/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/vehicles/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /api/customers/:id/vehicles - returns customer vehicles")
    void getByCustomer_returnsVehicles() throws Exception {
        createVehicle("Toyota", "Yaris", 2020, "VWX-5566", customerId);
        createVehicle("Honda", "Fit", 2019, "YZA-7788", customerId);

        mockMvc.perform(get("/api/customers/" + customerId + "/vehicles")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("POST /api/vehicles - 400 on duplicate license plate")
    void create_duplicateLicensePlate_returns400() throws Exception {
        createVehicle("Toyota", "Corolla", 2020, "DUP-0000", customerId);
        var req = buildRequest("Honda", "Civic", 2021, "DUP-0000", customerId);

        mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/vehicles - 401 without token")
    void create_noToken_returns401() throws Exception {
        mockMvc.perform(post("/api/vehicles")
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

    private String createVehicle(String brand, String model, int year, String plate, String custId) throws Exception {
        var req = buildRequest(brand, model, year, plate, custId);
        var res = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }

    private Map<String, Object> buildRequest(String brand, String model, int year, String plate, String custId) {
        return Map.of(
                "brand", brand,
                "model", model,
                "year", year,
                "license_plate", plate,
                "customer_id", custId
        );
    }
}
