package rd.dalventa.api.purchase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplierRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 20) String phone,
        @Size(max = 255) String email
) {}
