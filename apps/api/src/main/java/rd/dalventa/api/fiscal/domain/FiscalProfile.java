package rd.dalventa.api.fiscal.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

@Entity
@Table(name = "fiscal_profiles")
@Getter
@Setter
@NoArgsConstructor
public class FiscalProfile extends TenantAwareEntity {

    @Column(name = "business_name", nullable = false, length = 150)
    private String businessName;

    @Column(name = "trade_name", length = 150)
    private String tradeName;

    @Column(nullable = false, length = 20)
    private String rnc;

    @Column(name = "fiscal_address", columnDefinition = "TEXT")
    private String fiscalAddress;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(name = "tax_regime", length = 80)
    private String taxRegime;
}
