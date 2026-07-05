package rd.dalventa.api.denomination.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "denominations")
public class Denomination extends TenantAwareEntity {

    @Column(nullable = false)
    private BigDecimal value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private DenominationType type;

    @Column(nullable = false)
    private boolean active = true;

    public Denomination(BigDecimal value, DenominationType type) {
        this.value = value;
        this.type = type;
    }
}
