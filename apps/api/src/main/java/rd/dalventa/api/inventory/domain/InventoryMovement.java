package rd.dalventa.api.inventory.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "inventory_movements")
public class InventoryMovement extends TenantAwareEntity {

    @Column(name = "branch_inventory_id", nullable = false)
    private UUID branchInventoryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryMovementType type;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "previous_stock", nullable = false)
    private int previousStock;

    @Column(name = "new_stock", nullable = false)
    private int newStock;

    @Column(nullable = false)
    private String reason;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    public InventoryMovement(UUID branchInventoryId, InventoryMovementType type, int quantity,
                              int previousStock, int newStock, String reason, UUID userId) {
        this.branchInventoryId = branchInventoryId;
        this.type = type;
        this.quantity = quantity;
        this.previousStock = previousStock;
        this.newStock = newStock;
        this.reason = reason;
        this.userId = userId;
    }
}
