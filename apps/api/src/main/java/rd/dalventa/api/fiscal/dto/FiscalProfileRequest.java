package rd.dalventa.api.fiscal.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FiscalProfileRequest(
        @NotBlank @Size(max = 150) String businessName,
        @Size(max = 150) String tradeName,
        @NotBlank @Size(max = 20) String rnc,
        String fiscalAddress,
        @Size(max = 20) String phone,
        @Email @Size(max = 255) String email,
        @Size(max = 80) String taxRegime
) {
}
