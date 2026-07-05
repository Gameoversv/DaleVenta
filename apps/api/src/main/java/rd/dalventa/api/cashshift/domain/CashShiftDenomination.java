package rd.dalventa.api.cashshift.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "cash_shift_denominations")
public class CashShiftDenomination extends TenantAwareEntity {

    @Column(name = "cash_shift_id", nullable = false)
    private UUID cashShiftId;

    @Column(name = "denomination_id", nullable = false)
    private UUID denominationId;

    @Column(name = "opening_quantity", nullable = false)
    private int openingQuantity;

    @Column(name = "current_quantity", nullable = false)
    private int currentQuantity;

    @Column(name = "closing_quantity")
    private Integer closingQuantity;

    public CashShiftDenomination(UUID cashShiftId, UUID denominationId, int openingQuantity) {
        this.cashShiftId = cashShiftId;
        this.denominationId = denominationId;
        this.openingQuantity = openingQuantity;
        this.currentQuantity = openingQuantity;
    }
}
