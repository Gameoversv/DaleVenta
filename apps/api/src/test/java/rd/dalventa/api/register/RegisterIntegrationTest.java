package rd.dalventa.api.register;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RegisterIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void createRegister_forExistingBranch_persists() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Caja 1"));
    }

    @Test
    void createRegister_forBranchOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja X\",\"branchId\":\"" + branchId + "\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void listByBranch_forBranchOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/registers")
                        .header("Authorization", "Bearer " + tokenB)
                        .param("branchId", branchId))
                .andExpect(status().isNotFound());
    }

    @Test
    void updateRegister_asAdmin_persistsNewName() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        String registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/registers/" + registerId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja Principal\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Caja Principal"))
                .andExpect(jsonPath("$.data.branchId").value(branchId));
    }

    @Test
    void updateRegister_forRegisterOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        String registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/registers/" + registerId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"name\":\"Hackeada\"}"))
                .andExpect(status().isNotFound());
    }
}
