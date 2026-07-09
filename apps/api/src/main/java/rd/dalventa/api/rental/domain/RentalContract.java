package rd.dalventa.api.rental.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "rental_contracts")
public class RentalContract extends TenantAwareEntity {

    @Column(name = "contract_number", nullable = false, length = 30)
    private String contractNumber;

    @Column(name = "sale_id", nullable = false)
    private UUID saleId;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RentalContractStatus status = RentalContractStatus.ACTIVE;

    @Column(name = "expected_return_at", nullable = false)
    private Instant expectedReturnAt;

    @Column(name = "returned_at")
    private Instant returnedAt;

    @Column(name = "deposit_amount", nullable = false)
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public RentalContract(String contractNumber, UUID saleId, UUID customerId, UUID userId,
                          Instant expectedReturnAt, BigDecimal depositAmount, String notes) {
        this.contractNumber = contractNumber;
        this.saleId = saleId;
        this.customerId = customerId;
        this.userId = userId;
        this.expectedReturnAt = expectedReturnAt;
        this.depositAmount = depositAmount;
        this.notes = notes;
    }

    public void cancel() {
        this.status = RentalContractStatus.CANCELLED;
    }
}
