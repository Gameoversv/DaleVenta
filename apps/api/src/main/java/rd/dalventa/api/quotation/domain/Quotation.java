package rd.dalventa.api.quotation.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "quotations")
public class Quotation extends TenantAwareEntity {

    @Column(name = "quotation_number", nullable = false, length = 30)
    private String quotationNumber;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuotationStatus status = QuotationStatus.SENT;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(nullable = false)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_total", nullable = false)
    private BigDecimal taxTotal = BigDecimal.ZERO;

    @Column(name = "discount_amount", nullable = false)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Quotation(String quotationNumber, UUID customerId, UUID userId, LocalDate validUntil, String notes) {
        this.quotationNumber = quotationNumber;
        this.customerId = customerId;
        this.userId = userId;
        this.validUntil = validUntil;
        this.notes = notes;
    }

    public void setTotals(BigDecimal subtotal, BigDecimal taxTotal, BigDecimal discountAmount, BigDecimal total) {
        this.subtotal = subtotal;
        this.taxTotal = taxTotal;
        this.discountAmount = discountAmount;
        this.total = total;
    }

    public void setStatus(QuotationStatus status) {
        this.status = status;
    }
}
