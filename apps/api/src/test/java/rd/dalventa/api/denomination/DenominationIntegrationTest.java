package rd.dalventa.api.denomination;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DenominationIntegrationTest extends IntegrationTestBase {

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    void registeringTenant_seedsDefaultDominicanDenominations() throws Exception {
        registerTenantAndGetToken("admin@dalventa.test", "Secret123!");

        var tenantId = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals("admin@dalventa.test"))
                .findFirst().orElseThrow().getTenantId();

        var values = denominationRepository.findAllByTenantIdAndActiveTrue(tenantId).stream()
                .map(d -> d.getValue().stripTrailingZeros())
                .collect(java.util.stream.Collectors.toSet());

        assertThat(values).hasSize(10);
        assertThat(values).contains(
                BigDecimal.valueOf(2000).stripTrailingZeros(), BigDecimal.valueOf(1000).stripTrailingZeros(),
                BigDecimal.valueOf(500).stripTrailingZeros(), BigDecimal.valueOf(200).stripTrailingZeros(),
                BigDecimal.valueOf(100).stripTrailingZeros(), BigDecimal.valueOf(50).stripTrailingZeros(),
                BigDecimal.valueOf(25).stripTrailingZeros(), BigDecimal.valueOf(10).stripTrailingZeros(),
                BigDecimal.valueOf(5).stripTrailingZeros(), BigDecimal.valueOf(1).stripTrailingZeros()
        );
    }

    @Test
    void createDenomination_asAdmin_persists() throws Exception {
        String token = registerTenantAndGetToken("admin2@dalventa.test", "Secret123!");

        mockMvc.perform(post("/api/denominations")
                        .header("Authorization", "Bearer " + token)
                        .contentType("application/json")
                        .content("{\"value\":\"2000.00\",\"type\":\"BILL\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.value").value("2000.00"))
                .andExpect(jsonPath("$.data.type").value("BILL"));
    }

    @Test
    void listDenominations_returnsOnlyCurrentTenant() throws Exception {
        String tokenA = registerTenantAndGetToken("admin-a@dalventa.test", "Secret123!");
        String tokenB = registerTenantAndGetToken("admin-b@dalventa.test", "Secret123!");

        var resA = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        var resB = mockMvc.perform(get("/api/denominations").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        assertThat(objectMapper.readTree(resA).path("data")).hasSize(10);
        assertThat(objectMapper.readTree(resB).path("data")).hasSize(10);
    }
}
