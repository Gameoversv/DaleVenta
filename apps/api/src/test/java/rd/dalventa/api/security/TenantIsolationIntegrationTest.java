package rd.dalventa.api.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;
import rd.dalventa.api.support.TenantFixture;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The single highest-risk failure mode of a multi-tenant POS is a repository lookup that forgets its
 * {@code tenant_id} filter. These tests provision two independent tenants and assert that tenant B
 * can neither read nor mutate any resource that belongs to tenant A.
 */
class TenantIsolationIntegrationTest extends IntegrationTestBase {

    private static final String TENANT_A = "isolation-a@dalventa.test";
    private static final String TENANT_B = "isolation-b@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("tenant B cannot read tenant A resources by id")
    void crossTenantReads_returnNotFound() throws Exception {
        var a = provisionTenant(TENANT_A);
        var b = provisionTenant(TENANT_B);
        var saleId = createSale(a);
        var purchaseId = createReceivedPurchase(a);
        var quotationId = createQuotation(a);

        expectNotFound(get("/api/customers/" + a.customerId()), b);
        expectNotFound(get("/api/sales/" + saleId), b);
        expectNotFound(get("/api/sales/" + saleId + "/invoice"), b);
        expectNotFound(get("/api/purchases/" + purchaseId), b);
        expectNotFound(get("/api/purchases/" + purchaseId + "/payments"), b);
        expectNotFound(get("/api/quotations/" + quotationId), b);
        expectNotFound(get("/api/cash-shifts/" + a.cashShiftId() + "/summary"), b);
        expectNotFound(get("/api/cash-shifts/" + a.cashShiftId() + "/movements"), b);
        expectNotFound(get("/api/inventory/branch/" + a.branchId()), b);
        expectNotFound(get("/api/inventory/low-stock?branchId=" + a.branchId()), b);
        expectNotFound(get("/api/registers?branchId=" + a.branchId()), b);
    }

    @Test
    @DisplayName("tenant B cannot mutate tenant A resources by id")
    void crossTenantWrites_returnNotFound() throws Exception {
        var a = provisionTenant(TENANT_A);
        var b = provisionTenant(TENANT_B);
        var purchaseId = createPurchaseDraft(a);

        expectNotFound(put("/api/branches/" + a.branchId())
                .contentType("application/json")
                .content("{\"name\":\"Robada\",\"address\":\"X\"}"), b);
        expectNotFound(delete("/api/branches/" + a.branchId()), b);
        expectNotFound(put("/api/registers/" + a.registerId())
                .contentType("application/json")
                .content("{\"name\":\"Robada\"}"), b);
        expectNotFound(put("/api/products/" + a.productId())
                .contentType("application/json")
                .content("{\"categoryId\":\"" + b.categoryId() + "\",\"description\":\"Robado\",\"unit\":\"unidad\","
                        + "\"cost\":\"1.00\",\"salePrice\":\"2.00\",\"wholesalePrice\":\"2.00\",\"taxRate\":\"0.00\","
                        + "\"tracksInventory\":true,\"rentable\":false,\"active\":true}"), b);
        expectNotFound(delete("/api/categories/" + a.categoryId()), b);
        expectNotFound(put("/api/customers/" + a.customerId())
                .contentType("application/json")
                .content("{\"firstName\":\"Robada\",\"lastName\":\"Robada\"}"), b);
        expectNotFound(delete("/api/customers/" + a.customerId()), b);
        expectNotFound(put("/api/suppliers/" + a.supplierId())
                .contentType("application/json")
                .content("{\"name\":\"Robado\"}"), b);
        expectNotFound(delete("/api/suppliers/" + a.supplierId()), b);
        expectNotFound(patch("/api/purchases/" + purchaseId + "/receive"), b);
    }

    @Test
    @DisplayName("tenant B cannot manage tenant A users or their permission overrides")
    void crossTenantUserManagement_isRejected() throws Exception {
        var a = provisionTenant(TENANT_A);
        var b = provisionTenant(TENANT_B);
        var foreignUserId = userIdOf(a.email());

        expectNotFound(put("/api/users/" + foreignUserId)
                .contentType("application/json")
                .content("{\"name\":\"Secuestrado\",\"email\":\"secuestrado@dalventa.test\","
                        + "\"role\":\"CASHIER\",\"active\":true}"), b);
        expectNotFound(get("/api/users/" + foreignUserId + "/permissions"), b);
        expectNotFound(put("/api/users/" + foreignUserId + "/permissions/SALE_CREATE")
                .contentType("application/json")
                .content("{\"effect\":\"GRANT\"}"), b);
    }

    @Test
    @DisplayName("list endpoints only return rows owned by the calling tenant")
    void listEndpoints_doNotLeakAcrossTenants() throws Exception {
        var a = provisionTenant(TENANT_A);
        var b = provisionTenant(TENANT_B);
        createSale(a);
        createReceivedPurchase(a);

        // Each tenant provisioned exactly one branch, one register and one customer of its own.
        assertOwnRowsOnly("/api/branches", b, a.branchId());
        assertOwnRowsOnly("/api/registers?branchId=" + b.branchId(), b, a.registerId());
        assertOwnRowsOnly("/api/customers", b, a.customerId());
        assertOwnRowsOnly("/api/products", b, a.productId());
        assertOwnRowsOnly("/api/suppliers", b, a.supplierId());

        // Tenant B has its own register and has sold nothing, so its history must stay empty even
        // though tenant A recorded a sale moments earlier.
        mockMvc.perform(get("/api/sales").param("registerId", b.registerId().toString())
                        .header("Authorization", bearer(b.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mockMvc.perform(get("/api/purchases").header("Authorization", bearer(b.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
        mockMvc.perform(get("/api/purchases/accounts-payable").header("Authorization", bearer(b.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("global search never surfaces another tenant's catalog or customers")
    void globalSearch_isTenantScoped() throws Exception {
        var a = provisionTenant(TENANT_A);
        var b = provisionTenant(TENANT_B);

        // Tokens that exist only inside tenant A. Both tenants share the generic fixture names,
        // so the search assertions need something unmistakably owned by A.
        postJson(a.token(), "/api/products",
                "{\"categoryId\":\"" + a.categoryId() + "\",\"internalCode\":\"ZZTOP-1\",\"barcode\":null,"
                        + "\"description\":\"Zarzamora Exclusiva Alfa\",\"unit\":\"unidad\",\"cost\":\"1.00\","
                        + "\"salePrice\":\"2.00\",\"wholesalePrice\":\"2.00\",\"taxRate\":\"0.00\","
                        + "\"tracksInventory\":false,\"rentable\":false}");
        postJson(a.token(), "/api/customers",
                "{\"firstName\":\"Zoraida\",\"lastName\":\"Quisqueyana\",\"phone\":\"8095555555\"}");

        expectNoSearchResults(b, "Zarzamora");
        expectNoSearchResults(b, "Quisqueyana");
    }

    private void expectNoSearchResults(TenantFixture caller, String query) throws Exception {
        mockMvc.perform(get("/api/search").param("q", query).header("Authorization", bearer(caller.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.results.length()").value(0));
    }

    private void assertOwnRowsOnly(String url, TenantFixture caller, UUID foreignId) throws Exception {
        var body = mockMvc.perform(get(url).header("Authorization", bearer(caller.token())))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        for (var node : objectMapper.readTree(body).path("data")) {
            if (foreignId.toString().equals(node.path("id").asText())) {
                throw new AssertionError(url + " leaked a row owned by another tenant: " + foreignId);
            }
        }
    }

    private void expectNotFound(
            org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request,
            TenantFixture caller
    ) throws Exception {
        mockMvc.perform(request.header("Authorization", bearer(caller.token())))
                .andExpect(status().isNotFound());
    }

    /** Two units at 250.00 paid with a single 500 bill, so the drawer owes no change. */
    private UUID createSale(TenantFixture t) throws Exception {
        var res = postJson(t.token(), "/api/sales",
                "{\"registerId\":\"" + t.registerId() + "\",\"cashShiftId\":\"" + t.cashShiftId() + "\","
                        + "\"customerId\":null,\"items\":[{\"productId\":\"" + t.productId()
                        + "\",\"quantity\":2,\"useWholesalePrice\":false}],"
                        + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"500.00\","
                        + "\"receivedDenominations\":[{\"denominationId\":\"" + t.denomination500Id()
                        + "\",\"quantity\":1}]}]}");
        return UUID.fromString(extractId(res));
    }

    private UUID createQuotation(TenantFixture t) throws Exception {
        var res = postJson(t.token(), "/api/quotations",
                "{\"customerId\":\"" + t.customerId() + "\",\"items\":[{\"productId\":\"" + t.productId()
                        + "\",\"quantity\":2,\"useWholesalePrice\":false}]}");
        return UUID.fromString(extractId(res));
    }

    private UUID createPurchaseDraft(TenantFixture t) throws Exception {
        var res = postJson(t.token(), "/api/purchases",
                "{\"supplierId\":\"" + t.supplierId() + "\",\"branchId\":\"" + t.branchId() + "\","
                        + "\"invoiceNumber\":\"F-001\",\"items\":[{\"productId\":\"" + t.productId()
                        + "\",\"quantity\":5,\"unitCost\":\"100.00\"}]}");
        return UUID.fromString(extractId(res));
    }

    private UUID createReceivedPurchase(TenantFixture t) throws Exception {
        var purchaseId = createPurchaseDraft(t);
        mockMvc.perform(patch("/api/purchases/" + purchaseId + "/receive")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk());
        return purchaseId;
    }
}
