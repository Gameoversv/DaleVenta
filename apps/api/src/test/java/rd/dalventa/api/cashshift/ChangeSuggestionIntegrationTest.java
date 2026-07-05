package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ChangeSuggestionIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void changeSuggestion_forOpenShift_returnsExactCombination() throws Exception {
        String token = registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        var registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        var denomRes = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String d500 = null, d100 = null, d50 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            var v = node.path("value").asText();
            if (v.startsWith("500")) d500 = node.path("id").asText();
            if (v.startsWith("100")) d100 = node.path("id").asText();
            if (v.startsWith("50.")) d50 = node.path("id").asText();
        }

        mockMvc.perform(post("/api/cash-shifts/open")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                        + "{\"denominationId\":\"" + d500 + "\",\"quantity\":2},"
                        + "{\"denominationId\":\"" + d100 + "\",\"quantity\":2},"
                        + "{\"denominationId\":\"" + d50 + "\",\"quantity\":2}]}"));

        // Change needed: RD$650.00 -> 1x500 + 1x100 + 1x50, all available
        mockMvc.perform(post("/api/cash-shifts/change-suggestion")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"changeAmountCents\":65000,"
                                + "\"receivedDenominations\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exact").value(true));
    }

    @Test
    void changeSuggestion_withoutOpenShift_returnsNotFound() throws Exception {
        String token = registerTenantAndGetToken("admin2@dalventa.test", "Secret123!");

        var branchRes = mockMvc.perform(post("/api/branches")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}"))
                .andReturn().getResponse().getContentAsString();
        var branchId = objectMapper.readTree(branchRes).path("data").path("id").asText();

        var registerRes = mockMvc.perform(post("/api/registers")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}"))
                .andReturn().getResponse().getContentAsString();
        var registerId = objectMapper.readTree(registerRes).path("data").path("id").asText();

        mockMvc.perform(post("/api/cash-shifts/change-suggestion")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"changeAmountCents\":1000,"
                                + "\"receivedDenominations\":[]}"))
                .andExpect(status().isNotFound());
    }
}
