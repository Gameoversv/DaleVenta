package rd.dalventa.api.sale;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SaleDiscountIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID registerId, UUID cashShiftId, UUID productId) {}

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

        return new Setup(token, registerId, cashShiftId, productId);
    }

    @Test
    void createSale_wholesalePrice_usesWholesalePriceNotSalePrice() throws Exception {
        var s = setup("admin@dalventa.test");

        // wholesalePrice=300.00, quantity 1 -> total should be 300.00, not salePrice's 350.00
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"items\":[{\"productId\":\"" + s.productId()
                                + "\",\"quantity\":1,\"useWholesalePrice\":true}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"300.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-WS-1\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("300.00"))
                .andExpect(jsonPath("$.data.items[0].unitPrice").value("300.00"));
    }

    @Test
    void createSale_discountAsAdmin_appliesDiscount() throws Exception {
        var s = setup("admin2@dalventa.test");

        // salePrice 350.00, discount 50.00 -> total 300.00
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"discountAmount\":\"50.00\",\"items\":[{\"productId\":\""
                                + s.productId() + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"300.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-DISC-1\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("300.00"))
                .andExpect(jsonPath("$.data.discountAmount").value("50.00"));
    }

    @Test
    void createSale_discountAsCashierWithoutPermission_ignoresDiscount() throws Exception {
        var s = setup("admin3@dalventa.test");

        var admin = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin3@dalventa.test"))
                .findFirst().orElseThrow();
        admin.getRoles().clear();
        admin.addRole(roleRepository.findByName(rd.dalventa.api.auth.domain.RoleName.CASHIER).orElseThrow());
        userRepository.save(admin);

        // Cashier tries to apply a 50.00 discount on a 350.00 sale; permission is missing, so
        // discount is ignored and full payment of 350.00 must be provided to balance.
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"cashShiftId\":\"" + s.cashShiftId() + "\","
                                + "\"customerId\":null,\"discountAmount\":\"50.00\",\"items\":[{\"productId\":\""
                                + s.productId() + "\",\"quantity\":1,\"useWholesalePrice\":false}],"
                                + "\"payments\":[{\"method\":\"TRANSFER\",\"amount\":\"350.00\","
                                + "\"bank\":\"Banreservas\",\"reference\":\"REF-DISC-2\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.total").value("350.00"))
                .andExpect(jsonPath("$.data.discountAmount").value("0.00"));
    }
}
