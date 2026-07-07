package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;
import rd.dalventa.api.sale.domain.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
        UUID id,
        @JsonProperty("invoiceNumber") String invoiceNumber,
        @JsonProperty("fiscalReceiptType") FiscalReceiptType fiscalReceiptType,
        @JsonProperty("fiscalNcf") String fiscalNcf,
        SaleStatus status,
        @JsonProperty("createdAt") Instant createdAt,
        BusinessInfo business,
        String branchName,
        String registerName,
        InvoiceCustomerInfo customer,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountAmount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        List<InvoiceItemResponse> items,
        List<PaymentResponse> payments
) {
    public record BusinessInfo(
            String name,
            String rnc,
            String phone,
            String email,
            String address,
            String city,
            String logoUrl,
            String footerMessage,
            String printSize,
            boolean showLogo,
            boolean showRnc,
            boolean showPhone,
            boolean showEmail,
            boolean showAddress,
            boolean showCustomer,
            boolean showTax
    ) {}
}
