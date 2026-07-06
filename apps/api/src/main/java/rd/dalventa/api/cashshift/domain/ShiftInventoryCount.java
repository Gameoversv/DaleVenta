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
@Table(name = "shift_inventory_counts")
public class ShiftInventoryCount extends TenantAwareEntity {

    @Column(name = "cash_shift_id", nullable = false)
    private UUID cashShiftId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "opening_quantity", nullable = false)
    private int openingQuantity;

    @Column(name = "closing_quantity")
    private Integer closingQuantity;

    @Column(name = "expected_quantity")
    private Integer expectedQuantity;

    public ShiftInventoryCount(UUID cashShiftId, UUID productId, int openingQuantity) {
        this.cashShiftId = cashShiftId;
        this.productId = productId;
        this.openingQuantity = openingQuantity;
    }
}
