package rd.dalventa.api.sale.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "payments")
public class Payment extends TenantAwareEntity {

    @Column(name = "sale_id", nullable = false)
    private UUID saleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Column(nullable = false)
    private BigDecimal amount;

    public Payment(UUID saleId, PaymentMethod method, BigDecimal amount) {
        this.saleId = saleId;
        this.method = method;
        this.amount = amount;
    }
}
