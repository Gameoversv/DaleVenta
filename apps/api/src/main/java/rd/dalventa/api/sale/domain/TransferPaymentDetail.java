package rd.dalventa.api.sale.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "transfer_payment_details")
public class TransferPaymentDetail extends TenantAwareEntity {

    @Column(name = "payment_id", nullable = false)
    private UUID paymentId;

    @Column(nullable = false, length = 100)
    private String bank;

    @Column(nullable = false, length = 100)
    private String reference;

    @Column(nullable = false)
    private BigDecimal amount;

    public TransferPaymentDetail(UUID paymentId, String bank, String reference, BigDecimal amount) {
        this.paymentId = paymentId;
        this.bank = bank;
        this.reference = reference;
        this.amount = amount;
    }
}
