package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleVoidIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String registerId, String cashShiftId, String productId, String branchId) {}

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
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
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

        return new Setup(token, registerId, cashShiftId, productId, branchId);
    }

    @Test
    void voidSale_restoresInventoryAndReversesTransferPayment() throws Exception {
        var s = setup("admin@dalventa.test");

        var saleRes = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"500.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-VOID-1\"}]}"))
                .andReturn().getResponse().getContentAsString();
        var saleId = objectMapper.readTree(saleRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Cliente se arrepintio\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("VOIDED"));

        // Inventory restored: started with 10, sold 2 (down to 8), voided -> back to 10.
        var invRes = mockMvc.perform(get("/api/inventory/branch/" + s.branchId())
                        .header("Authorization", "Bearer " + s.token()))
                .andReturn().getResponse().getContentAsString();
        var stock = objectMapper.readTree(invRes).path("data").get(0).path("currentStock").asInt();
        org.assertj.core.api.Assertions.assertThat(stock).isEqualTo(10);
    }

    @Test
    void voidSale_alreadyVoided_returnsConflict() throws Exception {
        var s = setup("admin2@dalventa.test");

        var saleRes = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"250.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-VOID-2\"}]}"))
                .andReturn().getResponse().getContentAsString();
        var saleId = objectMapper.readTree(saleRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"voidReason\":\"Primera anulacion\"}"));

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Segundo intento\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void voidSale_afterShiftClosed_returnsBadRequest() throws Exception {
        var s = setup("admin3@dalventa.test");

        var saleRes = mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"250.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-VOID-3\"}]}"))
                .andReturn().getResponse().getContentAsString();
        var saleId = objectMapper.readTree(saleRes).path("data").path("id").asText();

        var d500Res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + s.token()))
                .andReturn().getResponse().getContentAsString();
        String d500 = null;
        for (var node : objectMapper.readTree(d500Res).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }
        mockMvc.perform(post("/api/cash-shifts/" + s.cashShiftId() + "/close")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"closingCounts\":[{\"denominationId\":\"" + d500 + "\",\"quantity\":2}]}"));

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Intento tardio\"}"))
                .andExpect(status().isBadRequest());
    }
}
