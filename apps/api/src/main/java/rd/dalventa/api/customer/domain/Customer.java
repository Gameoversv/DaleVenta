package rd.dalventa.api.customer.domain;

import jakarta.persistence.*;
import lombok.*;
import rd.dalventa.api.shared.domain.TenantAwareEntity;

@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
public class Customer extends TenantAwareEntity {

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(length = 20)
    private String phone;

    @Column(length = 20)
    private String whatsapp;

    @Column(length = 255)
    private String email;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "document_id", length = 20)
    private String documentId;

    @Column(nullable = false)
    private boolean active = true;
}
