package rd.dalventa.api.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record InvoiceSettingsRequest(
        @NotBlank String businessName,
        String rnc,
        String phone,
        String email,
        String address,
        String city,
        String logoUrl,
        String footerMessage,
        @Pattern(regexp = "LETTER|THERMAL_80MM|THERMAL_58MM") String printSize,
        boolean showLogo,
        boolean showRnc,
        boolean showPhone,
        boolean showEmail,
        boolean showAddress,
        boolean showCustomer,
        boolean showTax
) {}
