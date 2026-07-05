package rd.dalventa.api.branch.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "branches")
public class Branch extends TenantAwareEntity {

    @Column(nullable = false, length = 150)
    private String name;

    @Column
    private String address;

    @Column(nullable = false)
    private boolean active = true;

    public Branch(String name, String address) {
        this.name = name;
        this.address = address;
    }

    public void deactivate() {
        this.active = false;
    }
}
