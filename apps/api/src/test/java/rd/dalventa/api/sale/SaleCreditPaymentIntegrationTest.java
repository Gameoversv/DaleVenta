package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleCreditPaymentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String branchId, UUID registerId, UUID cashShiftId, UUID productId, String customerId) {}

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
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"0.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = UUID.fromString(objectMapper.readTree(productRes).path("data").path("id").asText());

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":50,\"reason\":\"Compra inicial\"}"));

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
        var cashShiftId = UUID.fromString(objectMapper.readTree(openRes).path("data").path("id").asText());

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"firstName\":\"Juana\",\"lastName\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/customers/" + customerId + "/credit-profile")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"));

        return new Setup(token, branchId, registerId, cashShiftId, productId, customerId);
    }

    @Test
    void createSale_creditPayment_increasesBalance() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":\"" + s.customerId() + "\",\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"250.00\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("250.00"));

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-account")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.balance").value("250.00"));
    }

    @Test
    void createSale_creditPaymentWithoutCustomer_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"250.00\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSale_creditPaymentExceedingLimit_rollsBackInventory() throws Exception {
        var s = setup("admin3@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":\"" + s.customerId() + "\",\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":5,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"CREDIT\",\"amount\":\"1250.00\"}]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/inventory/branch/" + s.branchId())
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data[0].currentStock").value(50));
    }
}
