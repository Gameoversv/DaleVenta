package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashShiftCurrentIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String registerId, String d100) {}

    private Setup setup(String email) throws Exception {
        String token = registerTenantAndGetToken(email, "Secret123!");

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
        String d100 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            if (node.path("value").asText().startsWith("100")) d100 = node.path("id").asText();
        }

        return new Setup(token, registerId, d100);
    }

    @Test
    void current_withOpenShift_returnsSummaryWithLiveExpectedCash() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/open")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content("{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                        + "{\"denominationId\":\"" + s.d100() + "\",\"quantity\":5}]}"));

        mockMvc.perform(get("/api/cash-shifts/current").param("registerId", s.registerId())
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.registerId").value(s.registerId()))
                .andExpect(jsonPath("$.data.expectedCash").value("500.00"));
    }

    @Test
    void current_withoutOpenShift_returnsNotFound() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(get("/api/cash-shifts/current").param("registerId", s.registerId())
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isNotFound());
    }

    @Test
    void current_registerFromOtherTenant_returnsNotFound() throws Exception {
        var s = setup("admin3@dalventa.test");
        String otherToken = registerTenantAndGetToken("admin4@dalventa.test", "Secret123!");

        mockMvc.perform(get("/api/cash-shifts/current").param("registerId", s.registerId())
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }
}
