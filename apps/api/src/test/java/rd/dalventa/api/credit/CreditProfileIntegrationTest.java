package rd.dalventa.api.credit;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CreditProfileIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String customerId) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

        var customerRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"firstName\":\"Juana\",\"lastName\":\"Perez\"}"))
                .andReturn().getResponse().getContentAsString();
        var customerId = objectMapper.readTree(customerRes).path("data").path("id").asText();

        return new Setup(token, customerId);
    }

    @Test
    void updateCreditProfile_asAdmin_persists() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(put("/api/customers/" + s.customerId() + "/credit-profile")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"creditEnabled\":true,\"creditLimit\":\"5000.00\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.creditEnabled").value(true))
                .andExpect(jsonPath("$.data.creditLimit").value("5000.00"));
    }

    @Test
    void getCreditAccount_beforeAnyActivity_returnsZeroBalance() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(get("/api/customers/" + s.customerId() + "/credit-account")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balance").value("0.00"));
    }

    @Test
    void updateCreditProfile_forCustomerOfOtherTenant_returnsNotFound() throws Exception {
        var s = setup("admin3@dalventa.test");
        registerTenantAndGetToken("admin4@dalventa.test", "Secret123!");
        String otherToken = registerTenantAndGetToken("admin5@dalventa.test", "Secret123!");

        mockMvc.perform(put("/api/customers/" + s.customerId() + "/credit-profile")
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType("application/json")
                        .content("{\"creditEnabled\":true,\"creditLimit\":\"1000.00\"}"))
                .andExpect(status().isNotFound());
    }
}
