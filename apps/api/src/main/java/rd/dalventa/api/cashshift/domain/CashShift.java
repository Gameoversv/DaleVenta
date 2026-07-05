package rd.dalventa.api.cashshift.domain;

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
@Table(name = "cash_shifts")
public class CashShift extends TenantAwareEntity {

    @Column(name = "register_id", nullable = false)
    private UUID registerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private CashShiftStatus status;

    @Column(name = "opened_by", nullable = false)
    private UUID openedBy;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    @Column(name = "opening_total", nullable = false)
    private BigDecimal openingTotal;

    @Column(name = "expected_cash")
    private BigDecimal expectedCash;

    @Column(name = "counted_cash")
    private BigDecimal countedCash;

    @Column(name = "cash_difference")
    private BigDecimal cashDifference;

    @Column(name = "closing_notes")
    private String closingNotes;

    public CashShift(UUID registerId, UUID openedBy, BigDecimal openingTotal) {
        this.registerId = registerId;
        this.openedBy = openedBy;
        this.openingTotal = openingTotal;
        this.status = CashShiftStatus.OPEN;
        this.openedAt = Instant.now();
    }
}
