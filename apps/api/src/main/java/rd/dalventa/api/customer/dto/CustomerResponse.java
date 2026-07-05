package rd.dalventa.api.customer.dto;

import rd.dalventa.api.customer.domain.Customer;

import java.time.Instant;
import java.util.UUID;

public record CustomerResponse(
        UUID id,
        String firstName,
        String lastName,
        String fullName,
        String phone,
        String whatsapp,
        String email,
        String address,
        String documentId,
        boolean active,
        Instant createdAt
) {
    public static CustomerResponse from(Customer c) {
        return new CustomerResponse(
                c.getId(),
                c.getFirstName(),
                c.getLastName(),
                c.getFirstName() + " " + c.getLastName(),
                c.getPhone(),
                c.getWhatsapp(),
                c.getEmail(),
                c.getAddress(),
                c.getDocumentId(),
                c.isActive(),
                c.getCreatedAt()
        );
    }
}
