package rd.dalventa.api.fiscal;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;
import rd.dalventa.api.support.TenantFixture;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NCF sequences are the fiscal backbone of a Dominican POS: a duplicated, skipped or expired number
 * is a compliance problem, so the numbering path is covered end to end.
 */
class FiscalIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "fiscal-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("fiscal status reflects the tenant feature flags")
    void status_reportsEnabledModules() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(get("/api/fiscal/status").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fiscalModuleEnabled").value(true))
                .andExpect(jsonPath("$.data.rentalModuleEnabled").value(true))
                .andExpect(jsonPath("$.data.purchaseModuleEnabled").value(true));
    }

    @Test
    @DisplayName("the profile falls back to the tenant data until it is filled in")
    void profile_defaultsToTenantDataThenPersists() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(get("/api/fiscal/profile").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.business_name").value("DaleVenta Test"))
                .andExpect(jsonPath("$.data.rnc").value(""));

        mockMvc.perform(put("/api/fiscal/profile")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"business_name\":\"Reposteria Dona Ana SRL\",\"trade_name\":\"Dona Ana\","
                                + "\"rnc\":\"131234567\",\"fiscal_address\":\"Calle Duarte 12\","
                                + "\"phone\":\"8090000000\",\"email\":\"fiscal@donaana.do\","
                                + "\"tax_regime\":\"Regimen ordinario\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.business_name").value("Reposteria Dona Ana SRL"))
                .andExpect(jsonPath("$.data.rnc").value("131234567"));

        mockMvc.perform(get("/api/fiscal/profile").header("Authorization", bearer(t.token())))
                .andExpect(jsonPath("$.data.trade_name").value("Dona Ana"));
    }

    @Test
    @DisplayName("a profile without business name or RNC is rejected")
    void profile_withoutMandatoryFields_returnsBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(put("/api/fiscal/profile")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"business_name\":\"\",\"rnc\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a sequence exposes its next NCF and how many are left")
    void createSequence_reportsNextNcfAndRemaining() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/fiscal/sequences")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(sequenceBody("B01", 1, 1, 50, futureDate(), true)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.next_ncf").value("B0100000001"))
                .andExpect(jsonPath("$.data.remaining").value(50))
                .andExpect(jsonPath("$.data.active").value(true));

        mockMvc.perform(get("/api/fiscal/sequences").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    @DisplayName("inconsistent or expired sequence ranges are rejected")
    void createSequence_withInvalidRange_returnsBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);

        // next below start
        mockMvc.perform(post("/api/fiscal/sequences")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(sequenceBody("B01", 10, 5, 50, futureDate(), true)))
                .andExpect(status().isBadRequest());

        // end below next
        mockMvc.perform(post("/api/fiscal/sequences")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(sequenceBody("B01", 1, 40, 20, futureDate(), true)))
                .andExpect(status().isBadRequest());

        // already expired
        mockMvc.perform(post("/api/fiscal/sequences")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(sequenceBody("B01", 1, 1, 50, "2020-01-01", true)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("each fiscal sale consumes exactly one NCF, in order and without gaps")
    void fiscalSales_consumeSequentialNcfs() throws Exception {
        var t = provisionTenant(ADMIN);
        createSequence(t, 1, 3);

        var first = fiscalSale(t);
        var second = fiscalSale(t);

        var firstNcf = objectMapper.readTree(first).path("data").path("fiscalNcf").asText();
        var secondNcf = objectMapper.readTree(second).path("data").path("fiscalNcf").asText();
        if (!"B0100000001".equals(firstNcf) || !"B0100000002".equals(secondNcf)) {
            throw new AssertionError("NCFs were not consumed in order: " + firstNcf + ", " + secondNcf);
        }

        mockMvc.perform(get("/api/fiscal/sequences").header("Authorization", bearer(t.token())))
                .andExpect(jsonPath("$.data[0].next_ncf").value("B0100000003"))
                .andExpect(jsonPath("$.data[0].remaining").value(1));
    }

    @Test
    @DisplayName("an exhausted sequence blocks the sale instead of reusing a number")
    void fiscalSale_withExhaustedSequence_isRejected() throws Exception {
        var t = provisionTenant(ADMIN);
        createSequence(t, 1, 1);

        fiscalSale(t);

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(fiscalSaleBody(t)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a fiscal sale without an active sequence is reported as not found")
    void fiscalSale_withoutSequence_returnsNotFound() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(fiscalSaleBody(t)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("the module is unreachable while the tenant flag is off")
    void moduleDisabled_isRejected() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/fiscal/profile").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/fiscal/sequences").header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
    }

    private void createSequence(TenantFixture t, int start, int end) throws Exception {
        mockMvc.perform(post("/api/fiscal/sequences")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(sequenceBody("B01", start, start, end, futureDate(), true)))
                .andExpect(status().isOk());
    }

    private String fiscalSale(TenantFixture t) throws Exception {
        return postJson(t.token(), "/api/sales", fiscalSaleBody(t));
    }

    /** Two units at 250.00 settled with one 500 bill and stamped with a B01 receipt. */
    private String fiscalSaleBody(TenantFixture t) {
        return "{\"registerId\":\"" + t.registerId() + "\",\"cashShiftId\":\"" + t.cashShiftId() + "\","
                + "\"customerId\":null,\"fiscalReceiptType\":\"B01\","
                + "\"items\":[{\"productId\":\"" + t.productId()
                + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"500.00\","
                + "\"receivedDenominations\":[{\"denominationId\":\"" + t.denomination500Id()
                + "\",\"quantity\":1}]}]}";
    }

    private String sequenceBody(String prefix, int start, int next, int end, String expiresAt, boolean active) {
        return "{\"receipt_type\":\"B01\",\"prefix\":\"" + prefix + "\",\"start_number\":" + start
                + ",\"next_number\":" + next + ",\"end_number\":" + end
                + ",\"expires_at\":\"" + expiresAt + "\",\"active\":" + active + "}";
    }

    private String futureDate() {
        return LocalDate.now().plusYears(1).toString();
    }
}
