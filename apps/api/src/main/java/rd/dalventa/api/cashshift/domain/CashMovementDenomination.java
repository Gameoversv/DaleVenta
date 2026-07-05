package rd.dalventa.api.cashshift.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "cash_movement_denominations")
public class CashMovementDenomination extends TenantAwareEntity {

    @Column(name = "cash_movement_id", nullable = false)
    private UUID cashMovementId;

    @Column(name = "denomination_id", nullable = false)
    private UUID denominationId;

    @Column(nullable = false)
    private int quantity;

    public CashMovementDenomination(UUID cashMovementId, UUID denominationId, int quantity) {
        this.cashMovementId = cashMovementId;
        this.denominationId = denominationId;
        this.quantity = quantity;
    }
}
