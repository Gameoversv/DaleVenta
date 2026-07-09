package rd.dalventa.api.quotation.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.quotation.domain.Quotation;
import rd.dalventa.api.quotation.domain.QuotationStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record QuotationResponse(
        UUID id,
        @JsonProperty("quotationNumber") String quotationNumber,
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("customerName") String customerName,
        QuotationStatus status,
        @JsonProperty("validUntil") LocalDate validUntil,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountAmount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        String notes,
        @JsonProperty("createdAt") Instant createdAt,
        List<QuotationItemResponse> items
) {
    public static QuotationResponse from(Quotation quotation, String customerName, List<QuotationItemResponse> items) {
        return new QuotationResponse(
                quotation.getId(), quotation.getQuotationNumber(), quotation.getCustomerId(), customerName,
                quotation.getStatus(), quotation.getValidUntil(), quotation.getSubtotal(), quotation.getTaxTotal(),
                quotation.getDiscountAmount(), quotation.getTotal(), quotation.getNotes(), quotation.getCreatedAt(),
                items
        );
    }
}
