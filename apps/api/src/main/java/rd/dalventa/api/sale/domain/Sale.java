package rd.dalventa.api.sale.domain;

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
@Table(name = "sales")
public class Sale extends TenantAwareEntity {

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(name = "register_id", nullable = false)
    private UUID registerId;

    @Column(name = "cash_shift_id", nullable = false)
    private UUID cashShiftId;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "invoice_sequence", nullable = false)
    private Long invoiceSequence;

    @Column(name = "invoice_number", nullable = false, length = 30)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SaleStatus status;

    @Column(nullable = false)
    private BigDecimal subtotal;

    @Column(name = "tax_total", nullable = false)
    private BigDecimal taxTotal;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal total;

    @Column(name = "voided_at")
    private Instant voidedAt;

    @Column(name = "voided_by")
    private UUID voidedBy;

    @Column(name = "void_reason")
    private String voidReason;

    public Sale(UUID branchId, UUID registerId, UUID cashShiftId, UUID customerId, UUID userId) {
        this.branchId = branchId;
        this.registerId = registerId;
        this.cashShiftId = cashShiftId;
        this.customerId = customerId;
        this.userId = userId;
        this.status = SaleStatus.COMPLETED;
    }
}
