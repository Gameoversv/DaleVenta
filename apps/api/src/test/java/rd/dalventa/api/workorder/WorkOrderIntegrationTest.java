package rd.dalventa.api.workorder;

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
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class WorkOrderIntegrationTest extends IntegrationTestBase {

    private String token;
    private String receptionId;

    @BeforeEach
    void setUp() throws Exception {
        cleanAll();
        token = registerTenantAndGetToken("admin@wo.rd", "pass1234");

        var custRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("first_name", "Pedro", "last_name", "Santos", "phone", "8091112233"))))
                .andReturn().getResponse().getContentAsString();
        String customerId = objectMapper.readTree(custRes).path("data").path("id").asText();

        var vehRes = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("brand", "Honda", "model", "Civic", "year", 2020,
                                        "license_plate", "WO-001", "customer_id", customerId))))
                .andReturn().getResponse().getContentAsString();
        String vehicleId = objectMapper.readTree(vehRes).path("data").path("id").asText();

        var checklist = Map.of(
                "exterior", Map.of("scratches", "NA", "dents", "NA", "lights", "OK"),
                "interior", Map.of("radio", "OK", "screen", "OK", "mats", "OK"),
                "mechanical", Map.of("oil_level", "OK", "coolant", "OK", "battery", "OK")
        );
        var recRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("vehicle_id", vehicleId, "entry_km", 45000,
                                        "reported_problem", "Falla en frenos", "checklist", checklist))))
                .andReturn().getResponse().getContentAsString();
        receptionId = objectMapper.readTree(recRes).path("data").path("id").asText();
    }

    @Test
    @DisplayName("POST /api/work-orders - crea orden de trabajo")
    void create_valid_returns201() throws Exception {
        var body = Map.of(
                "reception_id", receptionId,
                "diagnosis", "Pastillas de freno desgastadas",
                "assigned_to", "Mecánico Juan",
                "estimated_cost", 3500
        );

        mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.reception_id").value(receptionId))
                .andExpect(jsonPath("$.data.status").value("PENDIENTE"))
                .andExpect(jsonPath("$.data.diagnosis").value("Pastillas de freno desgastadas"))
                .andExpect(jsonPath("$.data.assigned_to").value("Mecánico Juan"))
                .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    @DisplayName("POST /api/work-orders - rechaza duplicado por recepción")
    void create_duplicate_receptionId_returns400() throws Exception {
        var body = Map.of("reception_id", receptionId);

        mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/work-orders/:id/items - agrega ítem de labor")
    void addItem_labor_addsToOrder() throws Exception {
        String orderId = createOrder();

        var item = Map.of(
                "description", "Cambio pastillas freno delanteras",
                "type", "LABOR",
                "quantity", 1,
                "unit_price", 1500
        );

        mockMvc.perform(post("/api/work-orders/" + orderId + "/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(item)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andExpect(jsonPath("$.data.items[0].type").value("LABOR"))
                .andExpect(jsonPath("$.data.items[0].total").value(1500));
    }

    @Test
    @DisplayName("PATCH /api/work-orders/:id/status - transición PENDIENTE → EN_PROGRESO")
    void updateStatus_pendienteToEnProgreso_setsStartedAt() throws Exception {
        String orderId = createOrder();

        mockMvc.perform(patch("/api/work-orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "EN_PROGRESO"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("EN_PROGRESO"))
                .andExpect(jsonPath("$.data.started_at").isNotEmpty());
    }

    @Test
    @DisplayName("PATCH /api/work-orders/:id/status - transición EN_PROGRESO → COMPLETADA calcula costo real")
    void updateStatus_completada_setsActualCost() throws Exception {
        String orderId = createOrder();

        mockMvc.perform(post("/api/work-orders/" + orderId + "/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("description", "Labor", "type", "LABOR",
                                        "quantity", 2, "unit_price", 800))));

        mockMvc.perform(patch("/api/work-orders/" + orderId + "/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "EN_PROGRESO"))));

        mockMvc.perform(patch("/api/work-orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "COMPLETADA"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETADA"))
                .andExpect(jsonPath("$.data.actual_cost").value(1600))
                .andExpect(jsonPath("$.data.completed_at").isNotEmpty());
    }

    @Test
    @DisplayName("PATCH /api/work-orders/:id/status - transición inválida COMPLETADA → EN_PROGRESO falla")
    void updateStatus_invalidTransition_returns400() throws Exception {
        String orderId = createOrder();

        mockMvc.perform(patch("/api/work-orders/" + orderId + "/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "EN_PROGRESO"))));

        mockMvc.perform(patch("/api/work-orders/" + orderId + "/status")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("status", "COMPLETADA"))));

        mockMvc.perform(patch("/api/work-orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "EN_PROGRESO"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /api/work-orders/:id/items/:itemId - elimina ítem")
    void removeItem_existing_removes() throws Exception {
        String orderId = createOrder();

        var addRes = mockMvc.perform(post("/api/work-orders/" + orderId + "/items")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("description", "Repuesto X", "type", "PARTS",
                                        "quantity", 1, "unit_price", 500))))
                .andReturn().getResponse().getContentAsString();
        String itemId = objectMapper.readTree(addRes).path("data").path("items").get(0).path("id").asText();

        mockMvc.perform(delete("/api/work-orders/" + orderId + "/items/" + itemId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(0)));
    }

    @Test
    @DisplayName("GET /api/work-orders - lista con filtro de estado")
    void findAll_filterByStatus_returnsList() throws Exception {
        createOrder();

        mockMvc.perform(get("/api/work-orders")
                        .header("Authorization", "Bearer " + token)
                        .param("status", "PENDIENTE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.meta.total").value(greaterThanOrEqualTo(1)));
    }

    private String createOrder() throws Exception {
        var body = Map.of("reception_id", receptionId);
        var res = mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }
}
