package rd.dalventa.api.vehicle.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import rd.dalventa.api.customer.domain.Customer;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

@Entity
@Table(name = "vehicles")
@Getter
@Setter
@NoArgsConstructor
public class Vehicle extends TenantAwareEntity {

    @Column(nullable = false, length = 100)
    private String brand;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(nullable = false)
    private Integer year;

    @Column(length = 100)
    private String engine;

    @Column(length = 17)
    private String vin;

    @Column(name = "license_plate", length = 20)
    private String licensePlate;

    @Column(length = 50)
    private String color;

    private Integer mileage;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Transmission transmission;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private VehicleModifications modifications;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false)
    private boolean active = true;
}
