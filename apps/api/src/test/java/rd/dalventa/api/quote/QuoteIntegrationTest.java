package rd.dalventa.api.quote;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class QuoteIntegrationTest extends IntegrationTestBase {

    private String token;
    private String workOrderId;

    @BeforeEach
    void setUp() throws Exception {
        cleanAll();
        token = registerTenantAndGetToken("admin@quote.rd", "pass1234");

        var custRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("first_name", "Ana", "last_name", "García", "phone", "8091230001"))))
                .andReturn().getResponse().getContentAsString();
        String customerId = objectMapper.readTree(custRes).path("data").path("id").asText();

        var vehRes = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("brand", "Nissan", "model", "Sentra", "year", 2021,
                                        "license_plate", "QT-001", "customer_id", customerId))))
                .andReturn().getResponse().getContentAsString();
        String vehicleId = objectMapper.readTree(vehRes).path("data").path("id").asText();

        var recRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("vehicle_id", vehicleId, "entry_km", 30000,
                                        "reported_problem", "Revisión general", "checklist", buildChecklist()))))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(recRes).path("data").path("id").asText();

        var woRes = mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reception_id", receptionId))))
                .andReturn().getResponse().getContentAsString();
        workOrderId = objectMapper.readTree(woRes).path("data").path("id").asText();
    }

    @Test
    @DisplayName("POST /api/quotes - crea cotización con ítems y calcula subtotal")
    void createQuote_valid_returns201WithTotals() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "apply_itbis", false,
                "items", List.of(
                        Map.of("item_type", "MANO_OBRA", "description", "Cambio aceite", "quantity", 1, "unit_price", 1200),
                        Map.of("item_type", "PIEZA", "description", "Filtro aceite", "quantity", 1, "unit_price", 350)
                )
        );

        mockMvc.perform(post("/api/quotes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.work_order_id").value(workOrderId))
                .andExpect(jsonPath("$.data.status").value("PENDIENTE"))
                .andExpect(jsonPath("$.data.items", hasSize(2)))
                .andExpect(jsonPath("$.data.subtotal").value(1550))
                .andExpect(jsonPath("$.data.itbis_amount").value(0))
                .andExpect(jsonPath("$.data.total").value(1550));
    }

    @Test
    @DisplayName("POST /api/quotes - aplica ITBIS 18%")
    void createQuote_withItbis_calculatesCorrectly() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "apply_itbis", true,
                "items", List.of(
                        Map.of("item_type", "MANO_OBRA", "description", "Mano de obra", "quantity", 1, "unit_price", 1000)
                )
        );

        mockMvc.perform(post("/api/quotes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subtotal").value(1000))
                .andExpect(jsonPath("$.data.itbis_amount").value(180))
                .andExpect(jsonPath("$.data.total").value(1180));
    }

    @Test
    @DisplayName("PATCH /api/quotes/:id/status - aprobar cotización")
    void approveQuote_changesStatusToAprobada() throws Exception {
        String quoteId = createQuote();

        mockMvc.perform(patch("/api/quotes/" + quoteId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "APROBADA"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APROBADA"));
    }

    @Test
    @DisplayName("PATCH /api/quotes/:id/status - rechazar cotización")
    void rejectQuote_changesStatusToRechazada() throws Exception {
        String quoteId = createQuote();

        mockMvc.perform(patch("/api/quotes/" + quoteId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "RECHAZADA"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RECHAZADA"));
    }

    @Test
    @DisplayName("GET /api/work-orders/:id/quotes - lista cotizaciones de una OT")
    void listByWorkOrder_returnsList() throws Exception {
        createQuote();

        mockMvc.perform(get("/api/work-orders/" + workOrderId + "/quotes")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("POST /api/quotes - falla sin ítems")
    void createQuote_noItems_returns400() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "apply_itbis", false,
                "items", List.of()
        );

        mockMvc.perform(post("/api/quotes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    private String createQuote() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "apply_itbis", false,
                "items", List.of(
                        Map.of("item_type", "MANO_OBRA", "description", "Servicio", "quantity", 1, "unit_price", 800)
                )
        );
        var res = mockMvc.perform(post("/api/quotes")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }
}
