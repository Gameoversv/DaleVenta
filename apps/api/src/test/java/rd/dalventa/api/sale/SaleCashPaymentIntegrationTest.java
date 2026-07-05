package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleCashPaymentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID registerId, UUID cashShiftId, UUID productId, String branchId, String d500, String d100, String d50) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        var registerId = UUID.fromString(objectMapper.readTree(registerRes).path("data").path("id").asText());

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = objectMapper.readTree(categoryRes).path("data").path("id").asText();

        var productRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"350.00\",\"wholesalePrice\":\"300.00\","
                                + "\"taxRate\":\"0.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = UUID.fromString(objectMapper.readTree(productRes).path("data").path("id").asText());

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":50,\"reason\":\"Compra inicial\"}"));

        var denomRes = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d500 = null, d100 = null, d50 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            var v = node.path("value").asText();
            if (v.startsWith("500")) d500 = node.path("id").asText();
            if (v.startsWith("100")) d100 = node.path("id").asText();
            if (v.startsWith("50.")) d50 = node.path("id").asText();
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d100 + "\",\"quantity\":5},"
                                + "{\"denominationId\":\"" + d50 + "\",\"quantity\":5}]}"))
                .andReturn().getResponse().getContentAsString();
        var cashShiftId = UUID.fromString(objectMapper.readTree(openRes).path("data").path("id").asText());

        return new Setup(token, registerId, cashShiftId, productId, branchId, d500, d100, d50);
    }

    @Test
    void createSale_cashPaymentWithChange_succeedsAndPersistsMovements() throws Exception {
        var s = setup("admin@dalventa.test");

        // Total = 350.00. Customer hands over one RD$500 bill -> change = 150.00 (1x100 + 1x50, both available).
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"350.00\","
                                + "\"receivedDenominations\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":1}]}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("350.00"));

        // Change = 150.00 -> minimal combination is 1x100 + 1x50 (both started at qty 5, now qty 4).
        // The received RD$500 bill (never in the shift's opening count) is lazily added with qty 1.
        var summaryRes = mockMvc.perform(get("/api/cash-shifts/" + s.cashShiftId() + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andReturn().getResponse().getContentAsString();
        var denominations = objectMapper.readTree(summaryRes).path("data").path("denominations");
        int d100Quantity = -1, d50Quantity = -1, d500Quantity = -1;
        for (var node : denominations) {
            var id = node.path("denominationId").asText();
            if (id.equals(s.d100())) d100Quantity = node.path("currentQuantity").asInt();
            if (id.equals(s.d50())) d50Quantity = node.path("currentQuantity").asInt();
            if (id.equals(s.d500())) d500Quantity = node.path("currentQuantity").asInt();
        }
        org.assertj.core.api.Assertions.assertThat(d100Quantity).isEqualTo(4);
        org.assertj.core.api.Assertions.assertThat(d50Quantity).isEqualTo(4);
        org.assertj.core.api.Assertions.assertThat(d500Quantity).isEqualTo(1);
    }

    @Test
    void createSale_cashPaymentNoExactChange_rollsBackEverything() throws Exception {
        var s = setup("admin2@dalventa.test");

        // Total = 350.00, customer hands RD$500 -> change 150.00, but shift has no 500s and the specific
        // 100/50 mix requested is exhausted below to force a no-exact-combination failure: request an
        // absurd change amount by paying less than total via a single RD$500 against a 340.00 owed amount
        // is awkward to construct generically, so instead we drain the shift of 50s to make 150 unreachable
        // with only 100s (needs 1x100 + 1x50, but only 100s remain).
        mockMvc.perform(post("/api/cash-shifts/" + s.cashShiftId() + "/movements")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"type\":\"WITHDRAWAL\",\"reason\":\"Retiro para forzar el caso\",\"denominations\":["
                        + "{\"denominationId\":\"" + s.d50() + "\",\"quantity\":5}]}"));

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"350.00\","
                                + "\"receivedDenominations\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":1}]}]}"))
                .andExpect(status().isBadRequest());

        // Inventory must NOT have been decremented — the whole sale rolled back, still 50.
        mockMvc.perform(get("/api/inventory/branch/" + s.branchId()).header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data[0].currentStock").value(50));
    }
}
