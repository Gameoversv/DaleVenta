package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.purchase.domain.Purchase;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountsPayableRow(
        @JsonProperty("purchaseId") UUID purchaseId,
        @JsonProperty("purchaseNumber") String purchaseNumber,
        @JsonProperty("invoiceNumber") String invoiceNumber,
        @JsonProperty("supplierId") UUID supplierId,
        @JsonProperty("supplierName") String supplierName,
        @JsonProperty("purchasedAt") Instant purchasedAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal total,
        @JsonProperty("paidAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal paidAmount,
        @JsonProperty("balanceDue") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal balanceDue
) {
    public static AccountsPayableRow from(Purchase purchase, String supplierName, BigDecimal paidAmount, BigDecimal balanceDue) {
        return new AccountsPayableRow(
                purchase.getId(),
                purchase.getPurchaseNumber(),
                purchase.getInvoiceNumber(),
                purchase.getSupplierId(),
                supplierName,
                purchase.getPurchasedAt(),
                purchase.getTotal(),
                paidAmount,
                balanceDue
        );
    }
}
