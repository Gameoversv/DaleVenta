package rd.dalventa.api.portal;

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

class PortalIntegrationTest extends IntegrationTestBase {

    private String staffToken;
    private String tenantSlug;
    private String customerId;
    private String vehicleId;
    private String documentId;

    @BeforeEach
    void setUp() throws Exception {
        cleanAll();

        // Register tenant and get staff token
        var body = Map.of(
                "tenant_name", "Taller Portal Test",
                "admin_name", "Admin Portal",
                "admin_email", "admin@portal.rd",
                "admin_password", "pass1234"
        );
        var tenantRes = mockMvc.perform(post("/api/tenants/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        staffToken = objectMapper.readTree(tenantRes).path("data").path("token").asText();

        // Slug is deterministic: buildSlug("Taller Portal Test") = "taller-portal-test"
        tenantSlug = "taller-portal-test";

        // Create customer with documentId
        documentId = "00112233445";
        var custRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("first_name", "Carlos", "last_name", "Reyes",
                                        "phone", "8091230003", "document_id", documentId))))
                .andReturn().getResponse().getContentAsString();
        customerId = objectMapper.readTree(custRes).path("data").path("id").asText();

        // Create vehicle for customer
        var vehRes = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("brand", "Kia", "model", "Rio", "year", 2020,
                                        "license_plate", "POR-001", "customer_id", customerId))))
                .andReturn().getResponse().getContentAsString();
        vehicleId = objectMapper.readTree(vehRes).path("data").path("id").asText();
    }

    @Test
    @DisplayName("POST /api/customers/:id/portal/invite - genera credenciales de portal")
    void invite_validCustomer_returns201WithCredentials() throws Exception {
        mockMvc.perform(post("/api/customers/" + customerId + "/portal/invite")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.document_id").value(documentId))
                .andExpect(jsonPath("$.data.temporary_password").isNotEmpty())
                .andExpect(jsonPath("$.data.portal_url").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/customers/:id/portal/invite - falla si ya tiene acceso")
    void invite_duplicate_returns400() throws Exception {
        mockMvc.perform(post("/api/customers/" + customerId + "/portal/invite")
                .header("Authorization", "Bearer " + staffToken));

        mockMvc.perform(post("/api/customers/" + customerId + "/portal/invite")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/portal/auth/login - cliente inicia sesión en portal")
    void portalLogin_validCredentials_returnsToken() throws Exception {
        String portalPassword = inviteAndGetPassword();

        mockMvc.perform(post("/api/portal/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tenant_slug", tenantSlug,
                                "document_id", documentId,
                                "password", portalPassword
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.token").isNotEmpty())
                .andExpect(jsonPath("$.data.customer_name").value("Carlos Reyes"));
    }

    @Test
    @DisplayName("POST /api/portal/auth/login - falla con contraseña incorrecta")
    void portalLogin_wrongPassword_returns401() throws Exception {
        inviteAndGetPassword();

        mockMvc.perform(post("/api/portal/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tenant_slug", tenantSlug,
                                "document_id", documentId,
                                "password", "wrongpass"
                        ))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/portal/vehicles - cliente ve sus vehículos")
    void getVehicles_authenticated_returnsCustomerVehicles() throws Exception {
        String portalToken = loginPortal();

        mockMvc.perform(get("/api/portal/vehicles")
                        .header("Authorization", "Bearer " + portalToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].license_plate").value("POR-001"));
    }

    @Test
    @DisplayName("GET /api/portal/vehicles/:id/history - cliente ve historial del vehículo")
    void getVehicleHistory_withReception_showsVisits() throws Exception {
        // Create reception for the vehicle
        var recRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("vehicle_id", vehicleId, "entry_km", 25000,
                                        "reported_problem", "Revisión anual", "checklist", buildChecklist()))))
                .andReturn().getResponse().getContentAsString();

        String portalToken = loginPortal();

        mockMvc.perform(get("/api/portal/vehicles/" + vehicleId + "/history")
                        .header("Authorization", "Bearer " + portalToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.license_plate").value("POR-001"))
                .andExpect(jsonPath("$.data.visits", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("GET /api/portal/invoices - cliente ve sus facturas")
    void getInvoices_authenticated_returnsInvoices() throws Exception {
        // Create full flow to have an invoice
        var recRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("vehicle_id", vehicleId, "entry_km", 20000,
                                        "reported_problem", "Falla motor", "checklist", buildChecklist()))))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(recRes).path("data").path("id").asText();

        var woRes = mockMvc.perform(post("/api/work-orders")
                        .header("Authorization", "Bearer " + staffToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reception_id", receptionId))))
                .andReturn().getResponse().getContentAsString();
        String woId = objectMapper.readTree(woRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/invoices")
                .header("Authorization", "Bearer " + staffToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "work_order_id", woId,
                        "issue_date", LocalDate.now().toString(),
                        "apply_itbis", false,
                        "items", List.of(Map.of("item_type", "MANO_OBRA", "description", "Reparación", "quantity", 1, "unit_price", 3000))
                ))));

        String portalToken = loginPortal();

        mockMvc.perform(get("/api/portal/invoices")
                        .header("Authorization", "Bearer " + portalToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("GET /api/portal/vehicles - sin token retorna 401")
    void getVehicles_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/portal/vehicles"))
                .andExpect(status().isUnauthorized());
    }

    private String inviteAndGetPassword() throws Exception {
        var res = mockMvc.perform(post("/api/customers/" + customerId + "/portal/invite")
                        .header("Authorization", "Bearer " + staffToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("temporary_password").asText();
    }

    private String loginPortal() throws Exception {
        String password = inviteAndGetPassword();
        var res = mockMvc.perform(post("/api/portal/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "tenant_slug", tenantSlug,
                                "document_id", documentId,
                                "password", password
                        ))))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("token").asText();
    }
}
