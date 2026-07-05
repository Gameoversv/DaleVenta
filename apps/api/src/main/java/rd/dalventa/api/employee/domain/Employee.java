package rd.dalventa.api.employee.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
public class Employee extends TenantAwareEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(length = 20)
    private String phone;

    @Column(length = 150)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoleName role = RoleName.MECHANIC;

    @Column(length = 100)
    private String position;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Column(precision = 12, scale = 2)
    private BigDecimal salary;

    @Column(nullable = false)
    private boolean active = true;
}

