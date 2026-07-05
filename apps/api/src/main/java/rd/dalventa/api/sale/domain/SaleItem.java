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
@Table(name = "sale_items")
public class SaleItem extends TenantAwareEntity {

    @Column(name = "sale_id", nullable = false)
    private UUID saleId;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "unit_price", nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "tax_rate", nullable = false)
    private BigDecimal taxRate;

    @Column(name = "line_total", nullable = false)
    private BigDecimal lineTotal;

    public SaleItem(UUID saleId, UUID productId, int quantity, BigDecimal unitPrice, BigDecimal taxRate, BigDecimal lineTotal) {
        this.saleId = saleId;
        this.productId = productId;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.taxRate = taxRate;
        this.lineTotal = lineTotal;
    }
}
