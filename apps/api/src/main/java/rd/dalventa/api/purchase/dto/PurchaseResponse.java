package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.purchase.domain.Purchase;
import rd.dalventa.api.purchase.domain.PurchaseStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseResponse(
        UUID id,
        @JsonProperty("purchaseNumber") String purchaseNumber,
        @JsonProperty("supplierId") UUID supplierId,
        @JsonProperty("supplierName") String supplierName,
        @JsonProperty("branchId") UUID branchId,
        @JsonProperty("branchName") String branchName,
        PurchaseStatus status,
        @JsonProperty("invoiceNumber") String invoiceNumber,
        @JsonProperty("purchasedAt") Instant purchasedAt,
        @JsonProperty("receivedAt") Instant receivedAt,
        String notes,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal subtotal,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        @JsonProperty("paidAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal paidAmount,
        @JsonProperty("balanceDue") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal balanceDue,
        List<PurchaseItemResponse> items
) {
    public static PurchaseResponse from(
            Purchase purchase,
            String supplierName,
            String branchName,
            BigDecimal paidAmount,
            BigDecimal balanceDue,
            List<PurchaseItemResponse> items
    ) {
        return new PurchaseResponse(
                purchase.getId(),
                purchase.getPurchaseNumber(),
                purchase.getSupplierId(),
                supplierName,
                purchase.getBranchId(),
                branchName,
                purchase.getStatus(),
                purchase.getInvoiceNumber(),
                purchase.getPurchasedAt(),
                purchase.getReceivedAt(),
                purchase.getNotes(),
                purchase.getSubtotal(),
                purchase.getTaxTotal(),
                purchase.getDiscountTotal(),
                purchase.getTotal(),
                paidAmount,
                balanceDue,
                items
        );
    }
}
