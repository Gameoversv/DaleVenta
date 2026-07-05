package rd.dalventa.api.cash.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "cash_transactions")
@Getter
@Setter
@NoArgsConstructor
public class CashTransaction extends TenantAwareEntity {

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(length = 100)
    private String category;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;
}

