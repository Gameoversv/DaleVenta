package rd.dalventa.api.credit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CreditPaymentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String customerId) {}

    private Setup setupWithBalance(String email, String balanceAmount) throws Exception {
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
        var registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

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
                                + "\"cost\":\"100.00\",\"salePrice\":\"" + balanceAmount + "\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"0.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = objectMapper.readTree(productRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":10,\"reason\":\"Compra inicial\"}"));

        var d500Res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d500 = null;
        for (var node : objectMapper.readTree(d500Res).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":2}]}"))
                .andReturn().getResponse().getContentAsString();
        var cashShiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"first_name\":\"Juana\",\"last_name\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/customers/" + customerId + "/credit-profile")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"));

        mockMvc.perform(post("/api/sales")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"registerId\":\"" + registerId + "\",\"cashShiftId\":\"" + cashShiftId + "\","
                        + "\"customerId\":\"" + customerId + "\",\"items\":[{\"productId\":\"" + productId
                        + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                        + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"" + balanceAmount + "\"}]}"));

        return new Setup(token, customerId);
    }

    @Test
    void recordPayment_reducesBalance() throws Exception {
        var s = setupWithBalance("admin@dalventa.test", "300.00");

        mockMvc.perform(post("/api/customers/" + s.customerId() + "/credit-payments")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"amount\":\"100.00\",\"note\":\"Abono parcial\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-account")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.balance").value("200.00"));
    }

    @Test
    void recordPayment_exceedingBalance_returnsBadRequest() throws Exception {
        var s = setupWithBalance("admin2@dalventa.test", "100.00");

        mockMvc.perform(post("/api/customers/" + s.customerId() + "/credit-payments")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"amount\":\"500.00\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listTransactions_showsChargeAndPayment() throws Exception {
        var s = setupWithBalance("admin3@dalventa.test", "300.00");

        mockMvc.perform(post("/api/customers/" + s.customerId() + "/credit-payments")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"amount\":\"100.00\"}"));

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-transactions")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].type").value("CHARGE"))
                .andExpect(jsonPath("$.data[1].type").value("PAYMENT"));
    }
}
