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
                .andExpect(jsonPath("$.data.total_sales").value(2))
                .andExpect(jsonPath("$.data.completed_sales").value(2))
                .andExpect(jsonPath("$.data.voided_sales").value(0))
                .andExpect(jsonPath("$.data.gross_revenue").value("1000.00"))
                .andExpect(jsonPath("$.data.average_ticket").value("500.00"))
                .andExpect(jsonPath("$.data.payments.length()").value(1))
                .andExpect(jsonPath("$.data.payments[0].method").value("CASH"))
                .andExpect(jsonPath("$.data.payments[0].amount").value(1000.00))
                .andExpect(jsonPath("$.data.top_products.length()").value(1))
                .andExpect(jsonPath("$.data.top_products[0].quantity").value(4))
                .andExpect(jsonPath("$.data.daily_sales.length()").value(1));
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
                .andExpect(jsonPath("$.data.total_sales").value(2))
                .andExpect(jsonPath("$.data.completed_sales").value(1))
                .andExpect(jsonPath("$.data.voided_sales").value(1))
                .andExpect(jsonPath("$.data.gross_revenue").value("500.00"))
                .andExpect(jsonPath("$.data.average_ticket").value("500.00"));
    }

    @Test
    @DisplayName("an empty range still returns one row per day with zero revenue")
    void salesReport_emptyRange_fillsEveryDay() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(get("/api/reports/sales")
                        .param("from", "2026-01-01").param("to", "2026-01-05")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total_sales").value(0))
                .andExpect(jsonPath("$.data.gross_revenue").value("0"))
                .andExpect(jsonPath("$.data.average_ticket").value("0"))
                .andExpect(jsonPath("$.data.payments.length()").value(0))
                .andExpect(jsonPath("$.data.daily_sales.length()").value(5));
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
                .andExpect(jsonPath("$.data.register_name").value("Caja 1"))
                .andExpect(jsonPath("$.data.completed_sales").value(1))
                .andExpect(jsonPath("$.data.gross_revenue").value("500.00"))
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
                .andExpect(jsonPath("$.data.close_number").value("CD-000001"))
                .andExpect(jsonPath("$.data.completed_sales").value(1))
                .andExpect(jsonPath("$.data.gross_revenue").value("500.00"));

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
