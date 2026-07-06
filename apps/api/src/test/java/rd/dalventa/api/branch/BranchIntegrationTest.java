package rd.dalventa.api.branch;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[?(@.name == 'Sucursal A')].name").value("Sucursal A"))
                .andExpect(jsonPath("$.data[?(@.name == 'Sucursal B')]").isEmpty());
    }

    @Test
    void createBranch_asCashierWithoutSettingsManage_returnsForbidden() throws Exception {
        String adminToken = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        // Register a second user under the same tenant as CASHIER via the admin-only
        // user creation endpoint is out of scope for this plan (Task 8 of the next
        // plan adds branch/register assignment); for this test, directly flip the
        // registered admin's role to CASHIER to exercise the permission check.
        var admin = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow();
        admin.getRoles().clear();
        admin.addRole(roleRepository.findByName(rd.dalventa.api.auth.domain.RoleName.CASHIER).orElseThrow());
        userRepository.save(admin);

        mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal No Permitida\",\"address\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateBranch_asAdmin_persistsChanges() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/branches/" + branchId)
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Renombrada\",\"address\":\"Nueva Direccion\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Sucursal Renombrada"))
                .andExpect(jsonPath("$.data.address").value("Nueva Direccion"));
    }

    @Test
    void updateBranch_forBranchOfOtherTenant_returnsNotFound() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");
        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal A\",\"address\":\"Dir A\"}"))
                .andReturn().getResponse().getContentAsString();
        String branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        mockMvc.perform(put("/api/branches/" + branchId)
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType("application/json")
                        .content("{\"name\":\"Hackeada\",\"address\":\"X\"}"))
                .andExpect(status().isNotFound());
    }
}
