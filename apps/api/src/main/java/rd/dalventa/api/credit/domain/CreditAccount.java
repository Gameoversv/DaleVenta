package rd.dalventa.api.credit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "credit_accounts")
public class CreditAccount extends TenantAwareEntity {

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private BigDecimal balance = BigDecimal.ZERO.setScale(2);

    public CreditAccount(UUID customerId) {
        this.customerId = customerId;
    }
}
