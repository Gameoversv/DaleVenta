package rd.dalventa.api.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
public class Product extends TenantAwareEntity {

    @Column(name = "internal_code", nullable = false, length = 50)
    private String internalCode;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "purchase_cost", nullable = false, precision = 12, scale = 2)
    private BigDecimal purchaseCost;

    @Column(name = "sale_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal salePrice;

    @Column(name = "current_stock", nullable = false)
    private int currentStock = 0;

    @Column(name = "min_stock", nullable = false)
    private int minStock = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ProductCategory category;

    @Column(nullable = false)
    private boolean active = true;
}

