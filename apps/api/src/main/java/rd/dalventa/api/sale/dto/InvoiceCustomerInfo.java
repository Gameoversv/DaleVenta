package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record InvoiceCustomerInfo(
        String name,
        @JsonProperty("documentId")
        String documentId,
        String phone,
        String email,
        String address
) {}
