package rd.dalventa.api.audit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;
import rd.dalventa.api.support.TenantFixture;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The audit log had no tests at all, and the endpoint only honoured `entityType` when an
 * `entityId` came with it — so the audit screen's dropdown, which sends the type on its own,
 * quietly returned every event no matter what was picked.
 */
class AuditLogIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "audit-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("only sensitive actions are recorded: a completed sale leaves no trace, voiding it does")
    void auditLog_recordsSensitiveActionsOnly() throws Exception {
        var t = provisionTenant(ADMIN);
        var saleId = extractId(createCashSale(t));

        mockMvc.perform(get("/api/audit-logs").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        voidSale(t, saleId);

        mockMvc.perform(get("/api/audit-logs").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].action").value("SALE_VOID"))
                .andExpect(jsonPath("$.data[0].entityType").value("SALE"))
                .andExpect(jsonPath("$.data[0].reason").value("Cliente se arrepintio"))
                .andExpect(jsonPath("$.data[0].actorName").value(org.hamcrest.Matchers.containsString(ADMIN)));
    }

    @Test
    @DisplayName("filtering by entity type alone narrows the log instead of returning everything")
    void auditLog_filtersByEntityTypeWithoutAnEntityId() throws Exception {
        var t = provisionTenant(ADMIN);
        voidSale(t, extractId(createCashSale(t)));
        closeShift(t);

        mockMvc.perform(get("/api/audit-logs").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.meta.total").value(2));

        mockMvc.perform(get("/api/audit-logs").param("entityType", "SALE")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].action").value("SALE_VOID"))
                .andExpect(jsonPath("$.meta.total").value(1));

        mockMvc.perform(get("/api/audit-logs").param("entityType", "CASH_SHIFT")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].action").value("CASH_SHIFT_CLOSE"));

        // A kind with nothing recorded comes back empty rather than falling back to everything.
        mockMvc.perform(get("/api/audit-logs").param("entityType", "DAILY_CLOSING")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0))
                .andExpect(jsonPath("$.meta.total").value(0));

        // An empty parameter is what the screen sends for "Todas", and must not filter anything out.
        mockMvc.perform(get("/api/audit-logs").param("entityType", "")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("one tenant never sees another tenant's audit trail")
    void auditLog_isScopedToTheTenant() throws Exception {
        var mine = provisionTenant(ADMIN);
        voidSale(mine, extractId(createCashSale(mine)));

        var other = provisionTenant("audit-other@dalventa.test");

        mockMvc.perform(get("/api/audit-logs").param("entityType", "SALE")
                        .header("Authorization", bearer(other.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    private String createCashSale(TenantFixture t) throws Exception {
        return postJson(t.token(), "/api/sales",
                "{\"registerId\":\"" + t.registerId() + "\",\"cashShiftId\":\"" + t.cashShiftId() + "\","
                        + "\"customerId\":null,\"items\":[{\"productId\":\"" + t.productId()
                        + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                        + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"500.00\","
                        + "\"receivedDenominations\":[{\"denominationId\":\"" + t.denomination500Id()
                        + "\",\"quantity\":1}]}]}");
    }

    private void voidSale(TenantFixture t, String saleId) throws Exception {
        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Cliente se arrepintio\"}"))
                .andExpect(status().isOk());
    }

    /** Opened with four RD$500 bills; the sale was voided, so the drawer is back to RD$2,000.00. */
    private void closeShift(TenantFixture t) throws Exception {
        mockMvc.perform(post("/api/cash-shifts/" + t.cashShiftId() + "/close")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + t.denomination500Id()
                                + "\",\"quantity\":4}]}"))
                .andExpect(status().isOk());
    }
}
