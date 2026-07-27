package rd.dalventa.api.quotation;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class QuotationIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "quotation-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("a quotation prices its lines, numbers itself and keeps stock untouched")
    void createQuotation_pricesLinesWithoutTouchingInventory() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"customerId\":\"" + t.customerId() + "\",\"validUntil\":\"2026-12-31\","
                                + "\"items\":[{\"productId\":\"" + t.productId()
                                + "\",\"quantity\":3,\"useWholesalePrice\":false}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.quotationNumber").value("CT-000001"))
                .andExpect(jsonPath("$.data.subtotal").value("750.00"))
                .andExpect(jsonPath("$.data.total").value("750.00"))
                .andExpect(jsonPath("$.data.customerName").value("Ana Perez"))
                .andExpect(jsonPath("$.data.items.length()").value(1));

        // A quotation is not a sale: the 50 units seeded by the fixture must still be there.
        mockMvc.perform(get("/api/inventory/branch/" + t.branchId()).header("Authorization", bearer(t.token())))
                .andExpect(jsonPath("$.data[?(@.productId=='" + t.productId() + "')].currentStock")
                        .value(org.hamcrest.Matchers.contains(50)));
    }

    @Test
    @DisplayName("wholesale pricing is honoured when the line asks for it")
    void createQuotation_withWholesalePrice_usesWholesaleRate() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"items\":[{\"productId\":\"" + t.productId()
                                + "\",\"quantity\":2,\"useWholesalePrice\":true}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.subtotal").value("400.00"))
                .andExpect(jsonPath("$.data.customerName").value("Cliente de contado"));
    }

    @Test
    @DisplayName("a discount above the total, a negative discount or no items are all rejected")
    void createQuotation_invalidTotals_returnBadRequest() throws Exception {
        var t = provisionTenant(ADMIN);
        var item = "{\"productId\":\"" + t.productId() + "\",\"quantity\":1,\"useWholesalePrice\":false}";

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"discountAmount\":\"9999.00\",\"items\":[" + item + "]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"discountAmount\":\"-1.00\",\"items\":[" + item + "]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"items\":[]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("unknown customers and products are reported as not found")
    void createQuotation_withUnknownReferences_returnsNotFound() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"customerId\":\"" + UUID.randomUUID() + "\",\"items\":[{\"productId\":\""
                                + t.productId() + "\",\"quantity\":1,\"useWholesalePrice\":false}]}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/quotations")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"items\":[{\"productId\":\"" + UUID.randomUUID()
                                + "\",\"quantity\":1,\"useWholesalePrice\":false}]}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("quotation numbers advance and the list returns every quotation of the tenant")
    void listQuotations_returnsAllWithSequentialNumbers() throws Exception {
        var t = provisionTenant(ADMIN);
        var item = "{\"productId\":\"" + t.productId() + "\",\"quantity\":1,\"useWholesalePrice\":false}";

        postJson(t.token(), "/api/quotations", "{\"items\":[" + item + "]}");
        var second = postJson(t.token(), "/api/quotations", "{\"items\":[" + item + "]}");

        var secondNumber = objectMapper.readTree(second).path("data").path("quotationNumber").asText();
        if (!"CT-000002".equals(secondNumber)) {
            throw new AssertionError("Expected the second quotation to be CT-000002 but got " + secondNumber);
        }

        mockMvc.perform(get("/api/quotations").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
    }

    @Test
    @DisplayName("a quotation detail can be fetched by id")
    void quotationDetail_returnsTheStoredQuotation() throws Exception {
        var t = provisionTenant(ADMIN);
        var created = postJson(t.token(), "/api/quotations",
                "{\"items\":[{\"productId\":\"" + t.productId() + "\",\"quantity\":4,\"useWholesalePrice\":false}]}");
        var id = extractId(created);

        mockMvc.perform(get("/api/quotations/" + id).header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.total").value("1000.00"));
    }
}
