package rd.dalventa.api.rental.domain;

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
@Table(name = "rental_contract_items")
public class RentalContractItem extends TenantAwareEntity {

    @Column(name = "rental_contract_id", nullable = false)
    private UUID rentalContractId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(nullable = false)
    private int quantity;

    public RentalContractItem(UUID rentalContractId, UUID productId, int quantity) {
        this.rentalContractId = rentalContractId;
        this.productId = productId;
        this.quantity = quantity;
    }
}
