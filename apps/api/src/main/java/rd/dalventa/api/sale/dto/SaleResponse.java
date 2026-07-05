package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record SaleResponse(
        UUID id,
        @JsonProperty("customerId") UUID customerId,
        SaleStatus status,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountAmount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        List<SaleItemResponse> items,
        List<PaymentResponse> payments
) {
    public static SaleResponse from(Sale sale, List<SaleItemResponse> items, List<PaymentResponse> payments) {
        return new SaleResponse(sale.getId(), sale.getCustomerId(), sale.getStatus(), sale.getSubtotal(),
                sale.getTaxTotal(), sale.getDiscountAmount(), sale.getTotal(), items, payments);
    }
}
