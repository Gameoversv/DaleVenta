package rd.dalventa.api.settings.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record InvoiceSettingsRequest(
        @JsonProperty("businessName") @NotBlank String businessName,
        String rnc,
        String phone,
        String email,
        String address,
        String city,
        @JsonProperty("logoUrl") String logoUrl,
        @JsonProperty("footerMessage") String footerMessage,
        @JsonProperty("printSize") @Pattern(regexp = "LETTER|THERMAL_80MM|THERMAL_58MM") String printSize,
        @JsonProperty("showLogo") boolean showLogo,
        @JsonProperty("showRnc") boolean showRnc,
        @JsonProperty("showPhone") boolean showPhone,
        @JsonProperty("showEmail") boolean showEmail,
        @JsonProperty("showAddress") boolean showAddress,
        @JsonProperty("showCustomer") boolean showCustomer,
        @JsonProperty("showTax") boolean showTax
) {}
