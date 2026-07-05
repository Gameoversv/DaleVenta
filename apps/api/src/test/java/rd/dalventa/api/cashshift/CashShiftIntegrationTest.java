package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashShiftIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, UUID registerId) {}

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
        var registerId = UUID.fromString(objectMapper.readTree(registerRes).path("data").path("id").asText());

        return new Setup(token, registerId);
    }

    private String denominationIdFor(String token, String valueStr) throws Exception {
        var res = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        var data = objectMapper.readTree(res).path("data");
        for (var node : data) {
            if (node.path("value").asText().startsWith(valueStr)) {
                return node.path("id").asText();
            }
        }
        throw new IllegalStateException("Denomination " + valueStr + " not found");
    }

    @Test
    void openCashShift_computesOpeningTotal() throws Exception {
        var s = setup("admin@dalventa.test");
        String d1000 = denominationIdFor(s.token(), "1000");
        String d500 = denominationIdFor(s.token(), "500");

        mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d1000 + "\",\"quantity\":2},"
                                + "{\"denominationId\":\"" + d500 + "\",\"quantity\":1}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("OPEN"))
                .andExpect(jsonPath("$.data.openingTotal").value("2500.00"));
    }

    @Test
    void openCashShift_whenRegisterAlreadyHasOpenShift_returnsConflict() throws Exception {
        var s = setup("admin2@dalventa.test");
        String d1000 = denominationIdFor(s.token(), "1000");
        String body = "{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                + "{\"denominationId\":\"" + d1000 + "\",\"quantity\":1}]}";

        mockMvc.perform(post("/api/cash-shifts/open")
                .header("Authorization", "Bearer " + s.token())
                .contentType("application/json")
                .content(body));

        mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void getSummary_returnsDenominationBreakdown() throws Exception {
        var s = setup("admin3@dalventa.test");
        String d1000 = denominationIdFor(s.token(), "1000");

        var openRes = mockMvc.perform(post("/api/cash-shifts/open")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"registerId\":\"" + s.registerId() + "\",\"openingCounts\":["
                                + "{\"denominationId\":\"" + d1000 + "\",\"quantity\":3}]}"))
                .andReturn().getResponse().getContentAsString();
        var shiftId = objectMapper.readTree(openRes).path("data").path("id").asText();

        mockMvc.perform(get("/api/cash-shifts/" + shiftId + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.denominations[0].openingQuantity").value(3))
                .andExpect(jsonPath("$.data.denominations[0].currentQuantity").value(3));
    }
}
