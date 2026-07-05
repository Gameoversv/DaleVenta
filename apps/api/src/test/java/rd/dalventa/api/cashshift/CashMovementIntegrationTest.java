package rd.dalventa.api.cashshift;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CashMovementIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private record Setup(String token, String shiftId, String denomination500Id) {}

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
    void entryMovement_increasesCurrentQuantityAndReturnsAmount() throws Exception {
        var s = setup("admin@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"type\":\"ENTRY\",\"reason\":\"Fondo adicional\",\"denominations\":["
                                + "{\"denominationId\":\"" + s.denomination500Id() + "\",\"quantity\":2}]}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value("1000.00"));

        mockMvc.perform(get("/api/cash-shifts/" + s.shiftId() + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.denominations[0].currentQuantity").value(6));
    }

    @Test
    void withdrawalMovement_exceedingAvailable_returnsBadRequest() throws Exception {
        var s = setup("admin2@dalventa.test");

        mockMvc.perform(post("/api/cash-shifts/" + s.shiftId() + "/movements")
                        .header("Authorization", "Bearer " + s.token())
                        .contentType("application/json")
                        .content("{\"type\":\"WITHDRAWAL\",\"reason\":\"Deposito\",\"denominations\":["
                                + "{\"denominationId\":\"" + s.denomination500Id() + "\",\"quantity\":10}]}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/cash-shifts/" + s.shiftId() + "/summary")
                        .header("Authorization", "Bearer " + s.token()))
                .andExpect(jsonPath("$.data.denominations[0].currentQuantity").value(4));
    }
}
