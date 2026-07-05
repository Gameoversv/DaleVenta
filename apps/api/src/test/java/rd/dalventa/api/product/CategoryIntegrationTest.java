package rd.dalventa.api.product;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CategoryIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void createCategory_persistsAndReturnsIt() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/categories")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Bizcochos\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Bizcochos"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void listCategories_returnsOnlyCurrentTenantCategories() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/categories")
                .header("Authorization", "Bearer " + tokenA)
                .contentType("application/json")
                .content("{\"name\":\"Categoria A\"}"));
        mockMvc.perform(post("/api/categories")
                .header("Authorization", "Bearer " + tokenB)
                .contentType("application/json")
                .content("{\"name\":\"Categoria B\"}"));

        mockMvc.perform(get("/api/categories").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Categoria A"));
    }
}
