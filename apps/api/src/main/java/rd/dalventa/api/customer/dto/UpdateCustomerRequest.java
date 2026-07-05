package rd.dalventa.api.customer.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Size;

public record UpdateCustomerRequest(
        @JsonProperty("firstName") @Size(max = 100) String firstName,
        @JsonProperty("lastName") @Size(max = 100) String lastName,
        @Size(max = 20) String phone,
        @Size(max = 20) String whatsapp,
        @Size(max = 255) String email,
        String address,
        @JsonProperty("documentId") @Size(max = 20) String documentId
) {}
