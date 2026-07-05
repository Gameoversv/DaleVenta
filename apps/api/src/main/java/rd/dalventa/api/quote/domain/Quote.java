package rd.dalventa.api.quote.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;
import rd.dalventa.api.workorder.domain.WorkOrder;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quotes")
@Getter
@Setter
@NoArgsConstructor
public class Quote extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_order_id", nullable = false)
    private WorkOrder workOrder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuoteStatus status = QuoteStatus.PENDIENTE;

    @Column(name = "apply_itbis", nullable = false)
    private boolean applyItbis = false;

    @Column(name = "itbis_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal itbisRate = new BigDecimal("0.18");

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "itbis_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal itbisAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "quote", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuoteItem> items = new ArrayList<>();
}

