package rd.dalventa.api.report;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;
import rd.dalventa.api.support.TenantFixture;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ReportIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "report-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("the sales report aggregates revenue, payment mix, top products and the daily series")
    void salesReport_aggregatesTodaySales() throws Exception {
        var t = provisionTenant(ADMIN);
        createCashSale(t);
        createCashSale(t);
        var today = LocalDate.now().toString();

        mockMvc.perform(get("/api/reports/sales").param("from", today).param("to", today)
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").value(2))
                .andExpect(jsonPath("$.data.completedSales").value(2))
                .andExpect(jsonPath("$.data.voidedSales").value(0))
                .andExpect(jsonPath("$.data.grossRevenue").value("1000.00"))
                .andExpect(jsonPath("$.data.averageTicket").value("500.00"))
                .andExpect(jsonPath("$.data.payments.length()").value(1))
                .andExpect(jsonPath("$.data.payments[0].method").value("CASH"))
                .andExpect(jsonPath("$.data.payments[0].amount").value(1000.00))
                .andExpect(jsonPath("$.data.topProducts.length()").value(1))
                .andExpect(jsonPath("$.data.topProducts[0].quantity").value(4))
                .andExpect(jsonPath("$.data.dailySales.length()").value(1));
    }

    @Test
    @DisplayName("voided sales count separately and never inflate revenue")
    void salesReport_excludesVoidedSalesFromRevenue() throws Exception {
        var t = provisionTenant(ADMIN);
        var saleId = extractId(createCashSale(t));
        createCashSale(t);

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Error de digitacion\"}"))
                .andExpect(status().isOk());

        var today = LocalDate.now().toString();
        mockMvc.perform(get("/api/reports/sales").param("from", today).param("to", today)
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").value(2))
                .andExpect(jsonPath("$.data.completedSales").value(1))
                .andExpect(jsonPath("$.data.voidedSales").value(1))
                .andExpect(jsonPath("$.data.grossRevenue").value("500.00"))
                .andExpect(jsonPath("$.data.averageTicket").value("500.00"));
    }

    @Test
    @DisplayName("an empty range still returns one row per day with zero revenue")
    void salesReport_emptyRange_fillsEveryDay() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(get("/api/reports/sales")
                        .param("from", "2026-01-01").param("to", "2026-01-05")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").value(0))
                .andExpect(jsonPath("$.data.grossRevenue").value("0"))
                .andExpect(jsonPath("$.data.averageTicket").value("0"))
                .andExpect(jsonPath("$.data.payments.length()").value(0))
                .andExpect(jsonPath("$.data.dailySales.length()").value(5));
    }

    @Test
    @DisplayName("an inverted or incomplete date range is rejected")
    void salesReport_invalidRange_returnsBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(get("/api/reports/sales")
                        .param("from", "2026-02-10").param("to", "2026-02-01")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/reports/sales").param("from", "2026-02-10")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/reports/sales").param("from", "not-a-date").param("to", "2026-02-01")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isBadRequest());
    }

    /**
     * Jackson is configured globally for SNAKE_CASE, and these DTOs had never opted out, so the
     * reports shipped `gross_revenue` while the web app read `grossRevenue`: every metric card
     * rendered zero no matter how much had been sold. The assertions above used to spell the keys
     * snake_case, which is why the suite stayed green through all of it — so this test pins the
     * names the client actually reads, and fails on the absence of the camelCase key rather than
     * on a value that a fallback could quietly supply.
     */
    @Test
    @DisplayName("report payloads use the camelCase keys the web app reads")
    void reportPayloads_useCamelCaseKeys() throws Exception {
        var t = provisionTenant(ADMIN);
        createCashSale(t);
        var today = LocalDate.now().toString();

        mockMvc.perform(get("/api/reports/sales").param("from", today).param("to", today)
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalSales").exists())
                .andExpect(jsonPath("$.data.completedSales").exists())
                .andExpect(jsonPath("$.data.voidedSales").exists())
                .andExpect(jsonPath("$.data.grossRevenue").exists())
                .andExpect(jsonPath("$.data.discountTotal").exists())
                .andExpect(jsonPath("$.data.taxTotal").exists())
                .andExpect(jsonPath("$.data.averageTicket").exists())
                .andExpect(jsonPath("$.data.topProducts[0].productId").exists())
                .andExpect(jsonPath("$.data.topProducts[0].productName").exists())
                .andExpect(jsonPath("$.data.dailySales[0].salesCount").exists())
                .andExpect(jsonPath("$.data.payments[0].paymentsCount").exists())
                // The snake_case spelling must be gone, not merely accompanied by a camelCase twin.
                .andExpect(jsonPath("$.data.gross_revenue").doesNotExist())
                .andExpect(jsonPath("$.data.top_products").doesNotExist());

        mockMvc.perform(get("/api/reports/daily-close")
                        .param("date", today).param("registerId", t.registerId().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.registerName").exists())
                .andExpect(jsonPath("$.data.completedSales").exists())
                .andExpect(jsonPath("$.data.grossRevenue").exists())
                .andExpect(jsonPath("$.data.cashExpected").exists())
                .andExpect(jsonPath("$.data.cashCounted").exists())
                .andExpect(jsonPath("$.data.cashDifference").exists())
                .andExpect(jsonPath("$.data.shifts[0].openedAt").exists())
                .andExpect(jsonPath("$.data.shifts[0].expectedCash").exists())
                .andExpect(jsonPath("$.data.cash_expected").doesNotExist());

        mockMvc.perform(post("/api/reports/daily-close")
                        .param("date", today).param("registerId", t.registerId().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.closeNumber").exists())
                .andExpect(jsonPath("$.data.closeDate").exists())
                .andExpect(jsonPath("$.data.registerName").exists())
                .andExpect(jsonPath("$.data.closedByName").exists())
                .andExpect(jsonPath("$.data.closedAt").exists())
                .andExpect(jsonPath("$.data.cashDifference").exists())
                .andExpect(jsonPath("$.data.close_number").doesNotExist());
    }

    @Test
    @DisplayName("the daily close report is scoped to the requested register")
    void dailyCloseReport_isScopedToRegister() throws Exception {
        var t = provisionTenant(ADMIN);
        createCashSale(t);
        var today = LocalDate.now().toString();

        mockMvc.perform(get("/api/reports/daily-close")
                        .param("date", today).param("registerId", t.registerId().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.registerName").value("Caja 1"))
                .andExpect(jsonPath("$.data.completedSales").value(1))
                .andExpect(jsonPath("$.data.grossRevenue").value("500.00"))
                .andExpect(jsonPath("$.data.shifts.length()").value(1));

        mockMvc.perform(get("/api/reports/daily-close")
                        .param("date", today).param("registerId", UUID.randomUUID().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("a daily close is stored once and cannot be duplicated for the same date and register")
    void saveDailyClose_isUniquePerDateAndRegister() throws Exception {
        var t = provisionTenant(ADMIN);
        createCashSale(t);
        var today = LocalDate.now().toString();

        mockMvc.perform(post("/api/reports/daily-close")
                        .param("date", today).param("registerId", t.registerId().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.closeNumber").value("CD-000001"))
                .andExpect(jsonPath("$.data.completedSales").value(1))
                .andExpect(jsonPath("$.data.grossRevenue").value("500.00"));

        mockMvc.perform(post("/api/reports/daily-close")
                        .param("date", today).param("registerId", t.registerId().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/reports/daily-closings").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    @DisplayName("saving a close without a register is rejected")
    void saveDailyClose_withoutRegister_returnsBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/reports/daily-close")
                        .param("date", LocalDate.now().toString())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isBadRequest());
    }

    /** Two units at 250.00 settled with one 500 bill, so every sale is worth exactly 500.00. */
    private String createCashSale(TenantFixture t) throws Exception {
        return postJson(t.token(), "/api/sales",
                "{\"registerId\":\"" + t.registerId() + "\",\"cashShiftId\":\"" + t.cashShiftId() + "\","
                        + "\"customerId\":null,\"items\":[{\"productId\":\"" + t.productId()
                        + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                        + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"500.00\","
                        + "\"receivedDenominations\":[{\"denominationId\":\"" + t.denomination500Id()
                        + "\",\"quantity\":1}]}]}");
    }
}
