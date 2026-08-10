package rd.dalventa.api.settings.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

// Los @Size reflejan el ancho real de las columnas en la tabla tenants
// (V4__tenants.sql, ensanchada para el telefono en V46). Sin ellos el valor
// llega a Postgres y el rechazo del motor sale como 500 en vez de un 400 que
// le diga al usuario que acortar.
public record InvoiceSettingsRequest(
        @JsonProperty("businessName")
        @NotBlank(message = "El nombre del negocio es obligatorio")
        @Size(max = 150, message = "El nombre del negocio no puede pasar de 150 caracteres")
        String businessName,
        @Size(max = 20, message = "El RNC no puede pasar de 20 caracteres") String rnc,
        @Size(max = 50, message = "El telefono no puede pasar de 50 caracteres") String phone,
        @Size(max = 255, message = "El correo no puede pasar de 255 caracteres") String email,
        String address,
        @Size(max = 100, message = "La ciudad no puede pasar de 100 caracteres") String city,
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
