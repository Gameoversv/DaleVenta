package rd.dalventa.api.credit.domain;

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
@Table(name = "credit_transactions")
public class CreditTransaction extends TenantAwareEntity {

    @Column(name = "credit_account_id", nullable = false)
    private UUID creditAccountId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CreditTransactionType type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(name = "sale_id")
    private UUID saleId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column
    private String note;

    @Column(name = "payer_name")
    private String payerName;

    public CreditTransaction(UUID creditAccountId, CreditTransactionType type, BigDecimal amount,
                              UUID saleId, UUID userId, String note) {
        this.creditAccountId = creditAccountId;
        this.type = type;
        this.amount = amount;
        this.saleId = saleId;
        this.userId = userId;
        this.note = note;
    }

    public CreditTransaction(UUID creditAccountId, CreditTransactionType type, BigDecimal amount,
                              UUID saleId, UUID userId, String note, String payerName) {
        this(creditAccountId, type, amount, saleId, userId, note);
        this.payerName = payerName;
    }
}
