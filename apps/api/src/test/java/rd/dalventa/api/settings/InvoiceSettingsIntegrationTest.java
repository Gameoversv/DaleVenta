package rd.dalventa.api.settings;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import rd.dalventa.api.support.IntegrationTestBase;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The invoice settings are the one screen whose field names the web app consumes directly, and they
 * had drifted: Jackson is configured SNAKE_CASE globally, so the API served business_name while the
 * web app read businessName. Reading showed every field blank and saving stored nulls, silently
 * losing the name, phone, address and footer printed on every invoice.
 *
 * These tests pin the camelCase contract the web app depends on.
 */
class InvoiceSettingsIntegrationTest extends IntegrationTestBase {

    private static final String ADMIN = "settings-admin@dalventa.test";

    @AfterEach
    void tearDown() {
        cleanAll();
    }

    private static final String PAYLOAD = """
            {"businessName":"Reposteria Dona Ana","rnc":"131234567","phone":"8095550101",
             "email":"factura@donaana.do","address":"Calle Duarte 12","city":"Santiago",
             "logoUrl":"https://cdn.donaana.do/logo.png","footerMessage":"Gracias por su compra",
             "printSize":"THERMAL_80MM","showLogo":true,"showRnc":true,"showPhone":false,
             "showEmail":false,"showAddress":true,"showCustomer":true,"showTax":false}
            """;

    @Test
    @DisplayName("settings are served in camelCase, defaulting to the tenant's own name")
    void getSettings_usesCamelCase() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(get("/api/settings/invoice").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.businessName").value("DaleVenta Test"))
                .andExpect(jsonPath("$.data.printSize").value("LETTER"))
                .andExpect(jsonPath("$.data.showLogo").exists())
                // The snake_case spelling must not come back, or the web app reads blanks again.
                .andExpect(jsonPath("$.data.business_name").doesNotExist())
                .andExpect(jsonPath("$.data.print_size").doesNotExist());
    }

    @Test
    @DisplayName("a camelCase payload is stored rather than silently dropped")
    void updateSettings_acceptsCamelCase() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(put("/api/settings/invoice")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content(PAYLOAD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.businessName").value("Reposteria Dona Ana"));

        mockMvc.perform(get("/api/settings/invoice").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.businessName").value("Reposteria Dona Ana"))
                .andExpect(jsonPath("$.data.city").value("Santiago"))
                .andExpect(jsonPath("$.data.footerMessage").value("Gracias por su compra"))
                .andExpect(jsonPath("$.data.logoUrl").value("https://cdn.donaana.do/logo.png"))
                .andExpect(jsonPath("$.data.printSize").value("THERMAL_80MM"));
    }

    @Test
    @DisplayName("the boolean toggles round-trip, including the ones turned off")
    void updateSettings_keepsFalseToggles() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(put("/api/settings/invoice")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content(PAYLOAD))
                .andExpect(status().isOk());

        // A dropped field would read as false too, so the true ones prove the payload was bound.
        mockMvc.perform(get("/api/settings/invoice").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.data.showLogo").value(true))
                .andExpect(jsonPath("$.data.showRnc").value(true))
                .andExpect(jsonPath("$.data.showPhone").value(false))
                .andExpect(jsonPath("$.data.showEmail").value(false))
                .andExpect(jsonPath("$.data.showTax").value(false));
    }

    @Test
    @DisplayName("an empty business name is rejected, since it heads every invoice")
    void updateSettings_withoutBusinessName_returnsBadRequest() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(put("/api/settings/invoice")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("{\"businessName\":\"\",\"printSize\":\"LETTER\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("an unknown print size is rejected")
    void updateSettings_withInvalidPrintSize_returnsBadRequest() throws Exception {
        var token = registerTenantAndGetToken(ADMIN, DEFAULT_PASSWORD);

        mockMvc.perform(put("/api/settings/invoice")
                        .header("Authorization", bearer(token))
                        .contentType("application/json")
                        .content("{\"businessName\":\"Dona Ana\",\"printSize\":\"A4\"}"))
                .andExpect(status().isBadRequest());
    }
}
