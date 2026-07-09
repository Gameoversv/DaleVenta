package rd.dalventa.api.purchase.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "purchases")
public class Purchase extends TenantAwareEntity {

    @Column(name = "purchase_number", nullable = false, length = 30)
    private String purchaseNumber;

    @Column(name = "supplier_id", nullable = false)
    private UUID supplierId;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PurchaseStatus status = PurchaseStatus.DRAFT;

    @Column(name = "invoice_number", length = 80)
    private String invoiceNumber;

    @Column(name = "purchased_at", nullable = false)
    private Instant purchasedAt;

    @Column(name = "received_at")
    private Instant receivedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_total", nullable = false)
    private BigDecimal taxTotal = BigDecimal.ZERO;

    @Column(name = "discount_total", nullable = false)
    private BigDecimal discountTotal = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(name = "created_by_user_id", nullable = false)
    private UUID createdByUserId;

    @Column(name = "received_by_user_id")
    private UUID receivedByUserId;
}
