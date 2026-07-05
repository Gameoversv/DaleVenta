package rd.dalventa.api.product.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "products")
public class Product extends TenantAwareEntity {

    @Column(name = "category_id", nullable = false)
    private UUID categoryId;

    @Column(name = "internal_code", nullable = false, length = 50)
    private String internalCode;

    @Column(length = 50)
    private String barcode;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, length = 30)
    private String unit;

    @Column(nullable = false)
    private BigDecimal cost;

    @Column(name = "sale_price", nullable = false)
    private BigDecimal salePrice;

    @Column(name = "wholesale_price", nullable = false)
    private BigDecimal wholesalePrice;

    @Column(name = "tax_rate", nullable = false)
    private BigDecimal taxRate;

    @Column(name = "tracks_inventory", nullable = false)
    private boolean tracksInventory = true;

    @Column(nullable = false)
    private boolean active = true;

    public Product(UUID categoryId, String internalCode, String barcode, String description, String unit,
                   BigDecimal cost, BigDecimal salePrice, BigDecimal wholesalePrice, BigDecimal taxRate,
                   boolean tracksInventory) {
        this.categoryId = categoryId;
        this.internalCode = internalCode;
        this.barcode = barcode;
        this.description = description;
        this.unit = unit;
        this.cost = cost;
        this.salePrice = salePrice;
        this.wholesalePrice = wholesalePrice;
        this.taxRate = taxRate;
        this.tracksInventory = tracksInventory;
    }
}
