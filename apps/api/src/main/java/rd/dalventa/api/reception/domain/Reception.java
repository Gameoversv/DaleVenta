package rd.dalventa.api.reception.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import rd.dalventa.api.shared.domain.TenantAwareEntity;
import rd.dalventa.api.vehicle.domain.Vehicle;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "receptions")
@Getter
@Setter
@NoArgsConstructor
public class Reception extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Column(name = "entry_km", nullable = false)
    private Integer entryKm;

    @Column(name = "reported_problem", nullable = false, columnDefinition = "TEXT")
    private String reportedProblem;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private ReceptionChecklist checklist;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private List<String> photos = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "signature_data", columnDefinition = "TEXT")
    private String signatureData;

    @Column(name = "signed_at")
    private java.time.Instant signedAt;

    @Column(nullable = false)
    private boolean active = true;
}

