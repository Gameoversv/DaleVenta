package rd.dalventa.api.settings.dto;

import rd.dalventa.api.tenant.domain.Tenant;

public record InvoiceSettingsResponse(
        String businessName,
        String rnc,
        String phone,
        String email,
        String address,
        String city,
        String logoUrl,
        String footerMessage,
        String printSize,
        boolean showLogo,
        boolean showRnc,
        boolean showPhone,
        boolean showEmail,
        boolean showAddress,
        boolean showCustomer,
        boolean showTax
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
