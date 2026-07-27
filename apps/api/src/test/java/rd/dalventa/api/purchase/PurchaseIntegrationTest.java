package rd.dalventa.api.purchase;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;
import rd.dalventa.api.support.TenantFixture;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PurchaseIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "purchase-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("creating a purchase computes line tax and discount and leaves it in DRAFT")
    void createPurchase_computesTotals() throws Exception {
        var t = provisionTenant(ADMIN);

        // 5 x 100.00 = 500.00 subtotal, minus 50.00 discount = 450.00 taxable, 18% tax = 81.00.
        mockMvc.perform(post("/api/purchases")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"supplierId\":\"" + t.supplierId() + "\",\"branchId\":\"" + t.branchId() + "\","
                                + "\"invoiceNumber\":\"F-100\",\"items\":[{\"productId\":\"" + t.productId()
                                + "\",\"quantity\":5,\"unitCost\":\"100.00\",\"taxRate\":\"18.00\","
                                + "\"discountAmount\":\"50.00\"}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.purchaseNumber").value("CP-000001"))
                .andExpect(jsonPath("$.data.subtotal").value("500.00"))
                .andExpect(jsonPath("$.data.discountTotal").value("50.00"))
                .andExpect(jsonPath("$.data.taxTotal").value("81.00"))
                .andExpect(jsonPath("$.data.total").value("531.00"))
                .andExpect(jsonPath("$.data.balanceDue").value("531.00"));
    }

    @Test
    @DisplayName("a purchase without items is rejected")
    void createPurchase_withoutItems_returnsBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/purchases")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"supplierId\":\"" + t.supplierId() + "\",\"branchId\":\"" + t.branchId()
                                + "\",\"items\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a line discount larger than its own subtotal is rejected")
    void createPurchase_discountAboveLineSubtotal_returnsBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/purchases")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"supplierId\":\"" + t.supplierId() + "\",\"branchId\":\"" + t.branchId() + "\","
                                + "\"items\":[{\"productId\":\"" + t.productId()
                                + "\",\"quantity\":1,\"unitCost\":\"100.00\",\"discountAmount\":\"200.00\"}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("receiving a purchase adds the stock once and cannot be repeated")
    void receivePurchase_incrementsStockOnce() throws Exception {
        var t = provisionTenant(ADMIN);
        var purchaseId = createDraft(t, 5, "100.00");

        mockMvc.perform(patch("/api/purchases/" + purchaseId + "/receive")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RECEIVED"))
                .andExpect(jsonPath("$.data.receivedAt").isNotEmpty());

        // The fixture seeded 50 units, so receiving 5 more must land on 55.
        mockMvc.perform(get("/api/inventory/branch/" + t.branchId())
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.productId=='" + t.productId() + "')].currentStock")
                        .value(org.hamcrest.Matchers.contains(55)));

        mockMvc.perform(patch("/api/purchases/" + purchaseId + "/receive")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("payments are only accepted on received purchases and never above the balance")
    void payments_respectStatusAndBalance() throws Exception {
        var t = provisionTenant(ADMIN);
        var purchaseId = createDraft(t, 5, "100.00");

        mockMvc.perform(post("/api/purchases/" + purchaseId + "/payments")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"amount\":\"100.00\",\"method\":\"CASH\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(patch("/api/purchases/" + purchaseId + "/receive")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/purchases/" + purchaseId + "/payments")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"amount\":\"900.00\",\"method\":\"CASH\"}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/purchases/" + purchaseId + "/payments")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"amount\":\"200.00\",\"method\":\"TRANSFER\",\"reference\":\"TR-1\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.paidAmount").value("200.00"))
                .andExpect(jsonPath("$.data.balanceDue").value("300.00"));

        mockMvc.perform(get("/api/purchases/" + purchaseId + "/payments")
                        .header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1));
    }

    @Test
    @DisplayName("accounts payable lists received purchases until they are fully paid")
    void accountsPayable_dropsFullyPaidPurchases() throws Exception {
        var t = provisionTenant(ADMIN);
        var purchaseId = createDraft(t, 5, "100.00");
        mockMvc.perform(patch("/api/purchases/" + purchaseId + "/receive")
                .header("Authorization", bearer(t.token())));

        mockMvc.perform(get("/api/purchases/accounts-payable").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].balanceDue").value("500.00"));

        mockMvc.perform(post("/api/purchases/" + purchaseId + "/payments")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"amount\":\"500.00\",\"method\":\"CASH\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/purchases/accounts-payable").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    @DisplayName("the whole module is unreachable while the tenant flag is off")
    void moduleDisabled_returnsForbidden() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/purchases").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/suppliers").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("a purchase cannot reference an unknown supplier or product")
    void createPurchase_withUnknownReferences_returnsNotFound() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/purchases")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"supplierId\":\"" + UUID.randomUUID() + "\",\"branchId\":\"" + t.branchId()
                                + "\",\"items\":[{\"productId\":\"" + t.productId()
                                + "\",\"quantity\":1,\"unitCost\":\"10.00\"}]}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/purchases")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"supplierId\":\"" + t.supplierId() + "\",\"branchId\":\"" + t.branchId()
                                + "\",\"items\":[{\"productId\":\"" + UUID.randomUUID()
                                + "\",\"quantity\":1,\"unitCost\":\"10.00\"}]}"))
                .andExpect(status().isNotFound());
    }

    private UUID createDraft(TenantFixture t, int quantity, String unitCost) throws Exception {
        var res = postJson(t.token(), "/api/purchases",
                "{\"supplierId\":\"" + t.supplierId() + "\",\"branchId\":\"" + t.branchId() + "\","
                        + "\"invoiceNumber\":\"F-001\",\"items\":[{\"productId\":\"" + t.productId()
                        + "\",\"quantity\":" + quantity + ",\"unitCost\":\"" + unitCost + "\"}]}");
        return UUID.fromString(extractId(res));
    }
}
