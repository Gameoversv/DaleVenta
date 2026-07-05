package rd.dalventa.api.invoice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import rd.dalventa.api.support.IntegrationTestBase;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class InvoiceIntegrationTest extends IntegrationTestBase {

    private String token;
    private String workOrderId;

    @BeforeEach
    void setUp() throws Exception {
        cleanAll();
        token = registerTenantAndGetToken("admin@inv.rd", "pass1234");

        var custRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("first_name", "Luis", "last_name", "Méndez", "phone", "8091230002"))))
                .andReturn().getResponse().getContentAsString();
        String customerId = objectMapper.readTree(custRes).path("data").path("id").asText();

        var vehRes = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("brand", "Toyota", "model", "Yaris", "year", 2022,
                                        "license_plate", "INV-001", "customer_id", customerId))))
                .andReturn().getResponse().getContentAsString();
        String vehicleId = objectMapper.readTree(vehRes).path("data").path("id").asText();

        var recRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("vehicle_id", vehicleId, "entry_km", 18000,
                                        "reported_problem", "Cambio aceite y filtros", "checklist", buildChecklist()))))
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
    @DisplayName("POST /api/invoices - genera factura sin ITBIS")
    void createInvoice_noItbis_returns201WithCorrectTotals() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "issue_date", LocalDate.now().toString(),
                "apply_itbis", false,
                "items", List.of(
                        Map.of("item_type", "MANO_OBRA", "description", "Cambio aceite", "quantity", 1, "unit_price", 1200),
                        Map.of("item_type", "PIEZA", "description", "Filtro aceite", "quantity", 2, "unit_price", 350)
                )
        );

        mockMvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.work_order_id").value(workOrderId))
                .andExpect(jsonPath("$.data.status").value("PENDIENTE"))
                .andExpect(jsonPath("$.data.subtotal").value(1900))
                .andExpect(jsonPath("$.data.itbis_amount").value(0))
                .andExpect(jsonPath("$.data.total").value(1900))
                .andExpect(jsonPath("$.data.items", hasSize(2)));
    }

    @Test
    @DisplayName("POST /api/invoices - genera factura con ITBIS 18%")
    void createInvoice_withItbis_calculatesCorrectly() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "issue_date", LocalDate.now().toString(),
                "apply_itbis", true,
                "items", List.of(
                        Map.of("item_type", "MANO_OBRA", "description", "Mano de obra", "quantity", 2, "unit_price", 1000)
                )
        );

        mockMvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subtotal").value(2000))
                .andExpect(jsonPath("$.data.itbis_amount").value(360))
                .andExpect(jsonPath("$.data.total").value(2360));
    }

    @Test
    @DisplayName("PATCH /api/invoices/:id/status - marcar como PAGADA")
    void updateStatus_toPagada_succeeds() throws Exception {
        String invoiceId = createInvoice();

        mockMvc.perform(patch("/api/invoices/" + invoiceId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "PAGADA"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAGADA"));
    }

    @Test
    @DisplayName("PATCH /api/invoices/:id/status - marcar como ANULADA")
    void updateStatus_toAnulada_succeeds() throws Exception {
        String invoiceId = createInvoice();

        mockMvc.perform(patch("/api/invoices/" + invoiceId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("status", "ANULADA"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ANULADA"));
    }

    @Test
    @DisplayName("GET /api/invoices/:id - retorna factura existente")
    void findById_existing_returns200() throws Exception {
        String invoiceId = createInvoice();

        mockMvc.perform(get("/api/invoices/" + invoiceId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(invoiceId))
                .andExpect(jsonPath("$.data.work_order_id").value(workOrderId));
    }

    @Test
    @DisplayName("GET /api/invoices - lista facturas del tenant")
    void list_returnsList() throws Exception {
        createInvoice();

        mockMvc.perform(get("/api/invoices")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("POST /api/invoices - falla sin ítems")
    void createInvoice_noItems_returns400() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "issue_date", LocalDate.now().toString(),
                "apply_itbis", false,
                "items", List.of()
        );

        mockMvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    private String createInvoice() throws Exception {
        var body = Map.of(
                "work_order_id", workOrderId,
                "issue_date", LocalDate.now().toString(),
                "apply_itbis", false,
                "items", List.of(
                        Map.of("item_type", "MANO_OBRA", "description", "Servicio general", "quantity", 1, "unit_price", 2000)
                )
        );
        var res = mockMvc.perform(post("/api/invoices")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }
}
