package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashShiftCloseIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String shiftId, String d500) {}

    private Setup openShiftWithFourFiveHundreds(String email) throws Exception {
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
        String d500 = null;
        for (var node : objectMapper.readTree(denomRes).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                d500 = node.path("id").asText();
            }
        }

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + registerId + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":4}]}"))
                .andReturn().getResponse().getContentAsString();
        var shiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        return new Setup(token, shiftId, d500);
    }

    @Test
    void closeShift_matchingCount_noDifference_closesWithoutRequiringNotes() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":4}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"))
                .andExpect(jsonPath("$.data.cashDifference").value("0.00"));
    }

    @Test
    void closeShift_withDifferenceAndNoNotes_returnsBadRequest() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin2@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":3}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void closeShift_withDifferenceAndNotes_closesAndRecordsDifference() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin3@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":3}],"
                                + "\"closingNotes\":\"Faltante detectado, en revision\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cashDifference").value("-500.00"));
    }

    @Test
    void closeShift_alreadyClosed_returnsConflict() throws Exception {
        var s = openShiftWithFourFiveHundreds("admin4@dalventa.test");
        String closeBody = "{\"closingCounts\":[{\"denominationId\":\"" + s.d500() + "\",\"quantity\":4}]}";

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content(closeBody));

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/close")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content(closeBody))
                .andExpect(status().isConflict());
    }
}
