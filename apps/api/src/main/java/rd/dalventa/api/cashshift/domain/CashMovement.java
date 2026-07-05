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
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cash_movements")
public class CashMovement extends TenantAwareEntity {

    @Column(name = "cash_shift_id", nullable = false)
    private UUID cashShiftId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CashMovementType type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String reason;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "sale_id")
    private UUID saleId;

    public CashMovement(UUID cashShiftId, CashMovementType type, BigDecimal amount, String reason, UUID userId) {
        this.cashShiftId = cashShiftId;
        this.type = type;
        this.amount = amount;
        this.reason = reason;
        this.userId = userId;
    }
}
