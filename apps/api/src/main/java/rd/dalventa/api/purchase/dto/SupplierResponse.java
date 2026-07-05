package rd.dalventa.api.purchase.dto;

import rd.dalventa.api.purchase.domain.Supplier;

import java.util.UUID;

public record SupplierResponse(UUID id, String name, String phone, String email) {
    public static SupplierResponse from(Supplier s) {
        return new SupplierResponse(s.getId(), s.getName(), s.getPhone(), s.getEmail());
    }
}
