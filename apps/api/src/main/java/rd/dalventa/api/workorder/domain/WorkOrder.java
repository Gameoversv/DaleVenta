package rd.dalventa.api.workorder.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.reception.domain.Reception;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "work_orders")
@Getter
@Setter
@NoArgsConstructor
public class WorkOrder extends TenantAwareEntity {

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reception_id", nullable = false, unique = true)
    private Reception reception;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WorkOrderStatus status = WorkOrderStatus.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private WorkOrderPriority priority = WorkOrderPriority.MEDIA;

    @Column(columnDefinition = "TEXT")
    private String diagnosis;

    @Column(name = "assigned_to", length = 100)
    private String assignedTo;

    @Column(name = "estimated_cost", precision = 10, scale = 2)
    private BigDecimal estimatedCost;

    @Column(name = "actual_cost", precision = 10, scale = 2)
    private BigDecimal actualCost;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @OneToMany(mappedBy = "workOrder", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<WorkOrderItem> items = new ArrayList<>();

    public void transitionTo(WorkOrderStatus next) {
        if (!this.status.canTransitionTo(next)) {
            throw new IllegalStateException(
                    "No se puede cambiar estado de " + this.status + " a " + next);
        }
        if (next == WorkOrderStatus.EN_PROGRESO) {
            this.startedAt = Instant.now();
        }
        if (next == WorkOrderStatus.COMPLETADA) {
            this.completedAt = Instant.now();
            this.actualCost = items.stream()
                    .map(WorkOrderItem::getTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }
        this.status = next;
    }
}

