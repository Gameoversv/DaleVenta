package rd.dalventa.api.sale.dto;

public record InvoiceCustomerInfo(
        String name,
        String documentId,
        String phone,
        String email,
        String address
) {}
