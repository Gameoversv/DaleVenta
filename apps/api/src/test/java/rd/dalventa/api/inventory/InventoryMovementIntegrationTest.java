package rd.dalventa.api.inventory;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InventoryMovementIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID branchId, UUID productId) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

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

        var productRes = mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                                + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andReturn().getResponse().getContentAsString();
        var productId = UUID.fromString(objectMapper.readTree(productRes).path("data").path("id").asText());

        return new Setup(token, branchId, productId);
    }

    @Test
    void entryMovement_onFirstTimeProduct_createsBranchInventoryAndIncreasesStock() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/inventory/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                                + "\",\"type\":\"ENTRY\",\"quantity\":20,\"reason\":\"Compra inicial\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.previousStock").value(0))
                .andExpect(jsonPath("$.data.newStock").value(20));

        mockMvc.perform(get("/api/inventory/branch/" + s.branchId()).header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data[0].currentStock").value(20));
    }

    @Test
    void exitMovement_exceedingStock_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/inventory/movements")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                        + "\",\"type\":\"ENTRY\",\"quantity\":5,\"reason\":\"Compra inicial\"}"));

        mockMvc.perform(post("/api/inventory/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                                + "\",\"type\":\"EXIT\",\"quantity\":10,\"reason\":\"Venta\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void adjustmentMovement_withoutReason_returnsBadRequest() throws Exception {
        var s = setup("admin3@dalventa.test");

        mockMvc.perform(post("/api/inventory/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"branchId\":\"" + s.branchId() + "\",\"productId\":\"" + s.productId()
                                + "\",\"type\":\"ADJUSTMENT\",\"quantity\":3,\"reason\":\"\"}"))
                .andExpect(status().isBadRequest());
    }
}
