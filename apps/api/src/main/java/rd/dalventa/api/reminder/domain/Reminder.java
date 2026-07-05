package rd.dalventa.api.reminder.domain;

import jakarta.persistence.*;
import lombok.*;
import rd.dalventa.api.shared.domain.TenantAwareEntity;
import rd.dalventa.api.vehicle.domain.Vehicle;

import java.time.LocalDate;

@Entity
@Table(name = "reminders")
@Getter
@Setter
@NoArgsConstructor
public class Reminder extends TenantAwareEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReminderType type;

    @Column(name = "custom_label", length = 200)
    private String customLabel;

    @Column(name = "last_service_km")
    private Integer lastServiceKm;

    @Column(name = "last_service_at")
    private LocalDate lastServiceAt;

    @Column(name = "interval_km")
    private Integer intervalKm;

    @Column(name = "interval_days")
    private Integer intervalDays;

    @Column(name = "next_km")
    private Integer nextKm;

    @Column(name = "next_date")
    private LocalDate nextDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReminderStatus status = ReminderStatus.UPCOMING;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    private boolean active = true;
}
