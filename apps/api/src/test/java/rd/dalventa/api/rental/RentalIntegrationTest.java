package rd.dalventa.api.rental;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;
import rd.dalventa.api.support.TenantFixture;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RentalIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "rental-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    @Test
    @DisplayName("selling a rentable product opens a rental contract for the customer")
    void saleOfRentableProduct_createsContract() throws Exception {
        var t = provisionTenant(ADMIN);

        var saleId = extractId(rentalSale(t, 2, expectedReturn(), "1000.00"));

        var body = mockMvc.perform(get("/api/rentals").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].contractNumber").value("RT-000001"))
                .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.data[0].saleId").value(saleId))
                .andExpect(jsonPath("$.data[0].depositAmount").value("1000.00"))
                .andExpect(jsonPath("$.data[0].items.length()").value(1))
                .andReturn().getResponse().getContentAsString();

        var customerName = objectMapper.readTree(body).path("data").get(0).path("customerName").asText();
        if (!"Ana Perez".equals(customerName)) {
            throw new AssertionError("Contract lost its customer: " + customerName);
        }
    }

    @Test
    @DisplayName("a rental needs both a customer and an expected return date")
    void rentalSale_withoutCustomerOrReturnDate_isRejected() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(saleBody(t, null, 2, expectedReturn(), "0.00")))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(saleBody(t, t.customerId().toString(), 2, null, "0.00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("a negative deposit is rejected")
    void rentalSale_withNegativeDeposit_isRejected() throws Exception {
        var t = provisionTenant(ADMIN);

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content(saleBody(t, t.customerId().toString(), 2, expectedReturn(), "-1.00")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("returning a contract is idempotent")
    void markReturned_isIdempotent() throws Exception {
        var t = provisionTenant(ADMIN);
        rentalSale(t, 2, expectedReturn(), "0.00");
        var contractId = firstContractId(t);

        mockMvc.perform(patch("/api/rentals/" + contractId + "/return").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RETURNED"))
                .andExpect(jsonPath("$.data.returnedAt").isNotEmpty());

        mockMvc.perform(patch("/api/rentals/" + contractId + "/return").header("Authorization", bearer(t.token())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("RETURNED"));
    }

    @Test
    @DisplayName("voiding the sale cancels its rental contract, which can no longer be returned")
    void voidingSale_cancelsContract() throws Exception {
        var t = provisionTenant(ADMIN);
        var saleId = extractId(rentalSale(t, 2, expectedReturn(), "0.00"));
        var contractId = firstContractId(t);

        mockMvc.perform(post("/api/sales/" + saleId + "/void")
                        .header("Authorization", bearer(t.token()))
                        .contentType("application/json")
                        .content("{\"voidReason\":\"Cliente desistio del alquiler\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/rentals").header("Authorization", bearer(t.token())))
                .andExpect(jsonPath("$.data[0].status").value("CANCELLED"));

        mockMvc.perform(patch("/api/rentals/" + contractId + "/return").header("Authorization", bearer(t.token())))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("the module is unreachable while the tenant flag is off")
    void moduleDisabled_returnsForbidden() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/rentals").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    private String firstContractId(TenantFixture t) throws Exception {
        var body = mockMvc.perform(get("/api/rentals").header("Authorization", bearer(t.token())))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").get(0).path("id").asText();
    }

    private String rentalSale(TenantFixture t, int quantity, String returnAt, String deposit)
            throws Exception {
        return postJson(t.token(), "/api/sales", saleBody(t, t.customerId().toString(), quantity, returnAt, deposit));
    }

    /**
     * Rentable units cost 250.00 each and the deposit is collected on top of the sale total, so the
     * cash paid is (250 x quantity) + deposit — always a multiple of 500 here, settled in 500 bills
     * so the drawer owes no change.
     */
    private String saleBody(TenantFixture t, String customerId, int quantity, String returnAt, String deposit) {
        var rentalDetails = returnAt == null
                ? "{\"depositAmount\":\"" + deposit + "\"}"
                : "{\"expectedReturnAt\":\"" + returnAt + "\",\"depositAmount\":\"" + deposit + "\"}";
        var amountToCollect = new java.math.BigDecimal("250.00")
                .multiply(java.math.BigDecimal.valueOf(quantity))
                .add(new java.math.BigDecimal(deposit));
        var bills = amountToCollect.max(java.math.BigDecimal.ZERO)
                .divide(new java.math.BigDecimal("500.00"), 0, java.math.RoundingMode.CEILING)
                .intValue();
        return "{\"registerId\":\"" + t.registerId() + "\",\"cashShiftId\":\"" + t.cashShiftId() + "\","
                + "\"customerId\":" + (customerId == null ? "null" : "\"" + customerId + "\"") + ","
                + "\"rentalDetails\":" + rentalDetails + ","
                + "\"items\":[{\"productId\":\"" + t.rentableProductId()
                + "\",\"quantity\":" + quantity + ",\"useWholesalePrice\":false}],"
                + "\"payments\":[{\"method\":\"CASH\",\"amount\":\"" + amountToCollect.setScale(2) + "\","
                + "\"receivedDenominations\":[{\"denominationId\":\"" + t.denomination500Id()
                + "\",\"quantity\":" + bills + "}]}]}";
    }

    private String expectedReturn() {
        return Instant.now().plus(7, ChronoUnit.DAYS).toString();
    }
}
