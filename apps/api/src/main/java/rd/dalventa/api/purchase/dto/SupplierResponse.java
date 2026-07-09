package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.purchase.domain.Supplier;

import java.util.UUID;

public record SupplierResponse(
        UUID id,
        String name,
        @JsonProperty("contactName") String contactName,
        String phone,
        String email,
        String address,
        @JsonProperty("taxId") String taxId,
        String notes,
        boolean active
) {
    public static SupplierResponse from(Supplier supplier) {
        return new SupplierResponse(
                supplier.getId(),
                supplier.getName(),
                supplier.getContactName(),
                supplier.getPhone(),
                supplier.getEmail(),
                supplier.getAddress(),
                supplier.getTaxId(),
                supplier.getNotes(),
                supplier.isActive()
        );
    }
}
