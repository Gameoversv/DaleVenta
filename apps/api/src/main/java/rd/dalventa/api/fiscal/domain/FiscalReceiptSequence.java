package rd.dalventa.api.fiscal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.time.LocalDate;

@Entity
@Table(name = "fiscal_receipt_sequences")
@Getter
@Setter
@NoArgsConstructor
public class FiscalReceiptSequence extends TenantAwareEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "receipt_type", nullable = false, length = 40)
    private FiscalReceiptType receiptType;

    @Column(nullable = false, length = 5)
    private String prefix;

    @Column(name = "start_number", nullable = false)
    private int startNumber;

    @Column(name = "next_number", nullable = false)
    private int nextNumber;

    @Column(name = "end_number", nullable = false)
    private int endNumber;

    @Column(name = "expires_at", nullable = false)
    private LocalDate expiresAt;

    @Column(nullable = false)
    private boolean active = true;
}
