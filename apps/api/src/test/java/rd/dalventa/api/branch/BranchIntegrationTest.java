package rd.dalventa.api.branch;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.greaterThan;

class BranchIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void createBranch_asAdmin_persistsAndReturnsIt() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Sucursal Centro"))
                .andExpect(jsonPath("$.data.active").value(true));
    }

    @Test
    void listBranches_returnsOnlyCurrentTenantBranches() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/branches")
                .header("Authorization", "Bearer " + tokenA)
                .contentType("application/json")
                .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"));
        mockMvc.perform(post("/api/branches")
                .header("Authorization", "Bearer " + tokenB)
                .contentType("application/json")
                .content("{\"name\":\"Sucursal B\",\"address\":\"Dir B\"}"));

        mockMvc.perform(get("/api/branches").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Sucursal A"));
    }
}
