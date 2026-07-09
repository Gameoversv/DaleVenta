package rd.dalventa.api.purchase.dto;

import jakarta.validation.constraints.NotBlank;

public record SupplierRequest(
        @NotBlank String name,
        String contactName,
        String phone,
        String email,
        String address,
        String taxId,
        String notes,
        Boolean active
) {}
