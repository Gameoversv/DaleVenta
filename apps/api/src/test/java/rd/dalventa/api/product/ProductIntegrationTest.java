package rd.dalventa.api.product;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private String createCategoryAndGetId(String token) throws Exception {
        var res = mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("id").asText();
    }

    @Test
    void createProduct_asAdmin_seesFullCostAndPrice() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        String categoryId = createCategoryAndGetId(token);

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                                + "\"barcode\":null,\"description\":\"Bizcocho de chocolate\",\"unit\":\"unidad\","
                                + "\"cost\":\"150.00\",\"salePrice\":\"350.00\",\"wholesalePrice\":\"300.00\","
                                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.internalCode").value("BIZ-001"))
                .andExpect(jsonPath("$.data.cost").value("150.00"))
                .andExpect(jsonPath("$.data.salePrice").value("350.00"));
    }

    @Test
    void createProduct_duplicateInternalCode_returnsConflict() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        String categoryId = createCategoryAndGetId(token);
        String body = "{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-001\","
                + "\"barcode\":null,\"description\":\"Bizcocho\",\"unit\":\"unidad\","
                + "\"cost\":\"150.00\",\"salePrice\":\"350.00\",\"wholesalePrice\":\"300.00\","
                + "\"taxRate\":\"18.00\",\"tracksInventory\":true}";

        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content(body));

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void listProducts_asCashierWithoutCostView_hidesCostAndPrice() throws Exception {
        String adminToken = registerTenantAndGetToken("admin2@dalventa.test", "Secret123!");
        String categoryId = createCategoryAndGetId(adminToken);
        mockMvc.perform(post("/api/products")
                .header("Authorization", "Bearer " + adminToken)
                .contentType("application/json")
                .content("{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"BIZ-002\","
                        + "\"barcode\":null,\"description\":\"Bizcocho de vainilla\",\"unit\":\"unidad\","
                        + "\"cost\":\"100.00\",\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\","
                        + "\"taxRate\":\"18.00\",\"tracksInventory\":true}"));

        var admin = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin2@dalventa.test"))
                .findFirst().orElseThrow();
        admin.getRoles().clear();
        admin.addRole(roleRepository.findByName(rd.dalventa.api.auth.domain.RoleName.CASHIER).orElseThrow());
        userRepository.save(admin);

        mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].internalCode").value("BIZ-002"))
                .andExpect(jsonPath("$.data[0].cost").doesNotExist())
                .andExpect(jsonPath("$.data[0].salePrice").doesNotExist());
    }
}
