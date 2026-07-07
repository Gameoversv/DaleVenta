package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SaleResponse(
        UUID id,
        @JsonProperty("invoiceNumber") String invoiceNumber,
        @JsonProperty("fiscalReceiptType") FiscalReceiptType fiscalReceiptType,
        @JsonProperty("fiscalNcf") String fiscalNcf,
        @JsonProperty("customerId") UUID customerId,
        SaleStatus status,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountAmount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        @JsonProperty("createdAt") Instant createdAt,
        @JsonProperty("voidedAt") Instant voidedAt,
        @JsonProperty("voidReason") String voidReason,
        List<SaleItemResponse> items,
        List<PaymentResponse> payments
) {
    public static SaleResponse from(Sale sale, List<SaleItemResponse> items, List<PaymentResponse> payments) {
        return new SaleResponse(sale.getId(), sale.getInvoiceNumber(), sale.getFiscalReceiptType(), sale.getFiscalNcf(),
                sale.getCustomerId(), sale.getStatus(), sale.getSubtotal(),
                sale.getTaxTotal(), sale.getDiscountAmount(), sale.getTotal(), sale.getCreatedAt(),
                sale.getVoidedAt(), sale.getVoidReason(), items, payments);
    }
}
