package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID registerId, UUID cashShiftId, UUID productId, String branchId) {}

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

        return new Setup(token, registerId, cashShiftId, productId, branchId);
    }

    @Test
    void createSale_withTransferPayment_decrementsInventoryAndPersists() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"500.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-001\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("500.00"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        // Started with 50 units, sold 2 -> 48 remaining.
        mockMvc.perform(get("/api/inventory/branch/" + s.branchId()).header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data[0].currentStock").value(48));
    }

    @Test
    void createSale_paymentSumMismatch_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"100.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-002\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createSale_duplicateTransferReference_returnsConflict() throws Exception {
        var s = setup("admin3@dalventa.test");
        String body1 = "{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"250.00\","
                + "\"bank\":\"Banreservas\",\"reference\":\"REF-DUP\"}]}";
        mockMvc.perform(post("/api/sales")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content(body1));

        String body2 = "{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"250.00\","
                + "\"bank\":\"Banreservas\",\"reference\":\"REF-DUP\"}]}";
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content(body2))
                .andExpect(status().isConflict());
    }

    @Test
    void createSale_withoutOpenShift_returnsNotFound() throws Exception {
        String token = registerTenantAndGetToken("admin4@dalventa.test", "Secret123!");

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

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"cashShiftId\":\""
                                + UUID.randomUUID() + "\",\"customerId\":null,\"items\":[],"
                                + "\"payments\":[]}"))
                .andExpect(status().isNotFound());
    }
}
