package rd.dalventa.api.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserOperationalScopeIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "scope-admin@dalventa.test";
    private static final String CASHIER = "scope-cashier@dalventa.test";

    @Test
    @DisplayName("a cashier can only list and operate assigned branches and registers")
    void cashierOnlySeesAndOperatesAssignedLocations() throws Exception {
        var tenant = provisionTenant(ADMIN);
        var otherBranchId = createBranch(tenant.token(), "Sucursal Norte");
        var otherRegisterId = createRegister(tenant.token(), otherBranchId, "Caja Norte");
        var cashierId = createUser(tenant.token(), "Cajera", CASHIER, DEFAULT_PASSWORD, RoleName.CASHIER);

        assign(tenant.token(), cashierId, tenant.branchId(), tenant.registerId())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.branchIds[0]").value(tenant.branchId().toString()))
                .andExpect(jsonPath("$.data.registerIds[0]").value(tenant.registerId().toString()));

        var cashierToken = login(CASHIER, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/branches").header("Authorization", bearer(cashierToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(tenant.branchId().toString()));
        mockMvc.perform(get("/api/registers").param("branchId", tenant.branchId().toString())
                        .header("Authorization", bearer(cashierToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(tenant.registerId().toString()));

        expectNotFound(get("/api/registers").param("branchId", otherBranchId.toString()), cashierToken);
        expectNotFound(get("/api/inventory/branch/" + otherBranchId), cashierToken);
        expectNotFound(post("/api/cash-shifts/open")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"registerId\":\"" + otherRegisterId + "\",\"openingCounts\":[]}"), cashierToken);
        expectNotFound(post("/api/sales")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"registerId\":\"" + otherRegisterId + "\",\"cashShiftId\":\""
                        + tenant.cashShiftId() + "\",\"customerId\":null,\"items\":[],\"payments\":[]}"), cashierToken);
    }

    @Test
    @DisplayName("a register assignment requires assigning its parent branch")
    void registerAssignmentRequiresItsParentBranch() throws Exception {
        var tenant = provisionTenant(ADMIN);
        var otherBranchId = createBranch(tenant.token(), "Sucursal Norte");
        var otherRegisterId = createRegister(tenant.token(), otherBranchId, "Caja Norte");
        var cashierId = createUser(tenant.token(), "Cajera", CASHIER, DEFAULT_PASSWORD, RoleName.CASHIER);

        assign(tenant.token(), cashierId, tenant.branchId(), otherRegisterId)
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("an administrator cannot assign a branch from another tenant")
    void assignmentsRejectForeignTenantLocations() throws Exception {
        var tenant = provisionTenant(ADMIN);
        var otherTenant = provisionTenant("scope-other@dalventa.test");
        var cashierId = createUser(tenant.token(), "Cajera", CASHIER, DEFAULT_PASSWORD, RoleName.CASHIER);

        assign(tenant.token(), cashierId, otherTenant.branchId(), otherTenant.registerId())
                .andExpect(status().isNotFound());
    }

    private UUID createBranch(String token, String name) throws Exception {
        return UUID.fromString(extractId(postJson(token, "/api/branches",
                "{\"name\":\"" + name + "\",\"address\":\"Calle Duarte 12\"}")));
    }

    private UUID createRegister(String token, UUID branchId, String name) throws Exception {
        return UUID.fromString(extractId(postJson(token, "/api/registers",
                "{\"name\":\"" + name + "\",\"branchId\":\"" + branchId + "\"}")));
    }

    private org.springframework.test.web.servlet.ResultActions assign(
            String token, UUID userId, UUID branchId, UUID registerId
    ) throws Exception {
        return mockMvc.perform(put("/api/users/" + userId + "/assignments")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"branchIds\":[\"" + branchId + "\"],\"registerIds\":[\""
                        + registerId + "\"]}"));
    }

    private void expectNotFound(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            String token
    ) throws Exception {
        mockMvc.perform(request.header("Authorization", bearer(token)))
                .andExpect(status().isNotFound());
    }
}
