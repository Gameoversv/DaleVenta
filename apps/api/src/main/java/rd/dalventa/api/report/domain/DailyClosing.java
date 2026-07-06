package rd.dalventa.api.report.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "daily_closings")
public class DailyClosing extends TenantAwareEntity {
    @Column(name = "close_number", nullable = false, length = 30)
    private String closeNumber;
    @Column(name = "close_sequence", nullable = false)
    private Long closeSequence;
    @Column(name = "close_date", nullable = false)
    private LocalDate closeDate;
    @Column(name = "register_id", nullable = false)
    private UUID registerId;
    @Column(name = "closed_by", nullable = false)
    private UUID closedBy;
    @Column(name = "closed_at", nullable = false)
    private Instant closedAt;
    @Column(name = "completed_sales", nullable = false)
    private long completedSales;
    @Column(name = "voided_sales", nullable = false)
    private long voidedSales;
    @Column(name = "gross_revenue", nullable = false)
    private BigDecimal grossRevenue;
    @Column(name = "tax_total", nullable = false)
    private BigDecimal taxTotal;
    @Column(name = "discount_total", nullable = false)
    private BigDecimal discountTotal;
    @Column(name = "cash_expected", nullable = false)
    private BigDecimal cashExpected;
    @Column(name = "cash_counted", nullable = false)
    private BigDecimal cashCounted;
    @Column(name = "cash_difference", nullable = false)
    private BigDecimal cashDifference;
}
