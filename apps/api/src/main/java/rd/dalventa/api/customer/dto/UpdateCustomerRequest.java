package rd.dalventa.api.customer.dto;

import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(
        @Size(max = 100) String firstName,
        @Size(max = 100) String lastName,
        @Size(max = 20) String phone,
        @Size(max = 20) String whatsapp,
        @Size(max = 255) String email,
        String address,
        @Size(max = 20) String documentId
) {}
