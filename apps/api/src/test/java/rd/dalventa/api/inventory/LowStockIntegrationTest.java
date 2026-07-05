package rd.dalventa.api.inventory;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class LowStockIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void lowStock_returnsOnlyProductsBelowMinimum() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = UUID.fromString(objectMapper.readTree(branchRes).path("data").path("id").asText());

        var categoryRes = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        var categoryId = objectMapper.readTree(categoryRes).path("data").path("id").asText();

        var lowProductRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-LOW\","
                                + "\"barcode\":null,\"description\":\"Bajo stock\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var lowProductId = objectMapper.readTree(lowProductRes).path("data").path("id").asText();

        var okProductRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-OK\","
                                + "\"barcode\":null,\"description\":\"Stock normal\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var okProductId = objectMapper.readTree(okProductRes).path("data").path("id").asText();

        // low product: 4 units, min 5 -> below minimum
        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + lowProductId
                        + "\",\"type\":\"ENTRY\",\"quantity\":4,\"reason\":\"Compra inicial\"}"));

        // ok product: 20 units, default min 0 -> not below minimum
        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"branchId\":\"" + branchId + "\",\"productId\":\"" + okProductId
                        + "\",\"type\":\"ENTRY\",\"quantity\":20,\"reason\":\"Compra inicial\"}"));

        // Directly set min_stock=5 for the low product's BranchInventory row (no endpoint
        // to configure min/max exists yet in this plan's scope; that's a product-edit
        // concern for a later iteration, so we reach into the repository for the test).
        var tenantId = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow().getTenantId();
        var lowInventory = branchInventoryRepository
                .findByTenantIdAndBranchIdAndProductId(tenantId, branchId, UUID.fromString(lowProductId))
                .orElseThrow();
        lowInventory.setMinStock(5);
        branchInventoryRepository.save(lowInventory);

        mockMvc.perform(get("/api/inventory/low-stock?branchId=" + branchId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].productId").value(lowProductId));
    }
}
