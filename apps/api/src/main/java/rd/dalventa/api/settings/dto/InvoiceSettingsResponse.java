package rd.dalventa.api.settings.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import rd.dalventa.api.tenant.domain.Tenant;

public record InvoiceSettingsResponse(
        @JsonProperty("businessName") String businessName,
        String rnc,
        String phone,
        String email,
        String address,
        String city,
        @JsonProperty("logoUrl") String logoUrl,
        @JsonProperty("footerMessage") String footerMessage,
        @JsonProperty("printSize") String printSize,
        @JsonProperty("showLogo") boolean showLogo,
        @JsonProperty("showRnc") boolean showRnc,
        @JsonProperty("showPhone") boolean showPhone,
        @JsonProperty("showEmail") boolean showEmail,
        @JsonProperty("showAddress") boolean showAddress,
        @JsonProperty("showCustomer") boolean showCustomer,
        @JsonProperty("showTax") boolean showTax
) {
    public static InvoiceSettingsResponse from(Tenant tenant) {
        return new InvoiceSettingsResponse(
                tenant.getName(),
                tenant.getRnc(),
                tenant.getPhone(),
                tenant.getEmail(),
                tenant.getAddress(),
                tenant.getCity(),
                tenant.getLogoUrl(),
                tenant.getInvoiceFooterMessage(),
                tenant.getInvoicePrintSize(),
                tenant.isInvoiceShowLogo(),
                tenant.isInvoiceShowRnc(),
                tenant.isInvoiceShowPhone(),
                tenant.isInvoiceShowEmail(),
                tenant.isInvoiceShowAddress(),
                tenant.isInvoiceShowCustomer(),
                tenant.isInvoiceShowTax()
        );
    }
}
