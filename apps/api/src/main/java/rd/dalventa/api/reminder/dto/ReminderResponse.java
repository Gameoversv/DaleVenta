package rd.dalventa.api.reminder.dto;

import rd.dalventa.api.reminder.domain.Reminder;
import rd.dalventa.api.reminder.domain.ReminderStatus;
import rd.dalventa.api.reminder.domain.ReminderType;

import java.time.LocalDate;
import java.util.UUID;

public record ReminderResponse(
    UUID id,
    UUID vehicleId,
    String vehicleLabel,
    String licensePlate,
    ReminderType type,
    String customLabel,
    Integer lastServiceKm,
    LocalDate lastServiceAt,
    Integer intervalKm,
    Integer intervalDays,
    Integer nextKm,
    LocalDate nextDate,
    ReminderStatus status,
    String notes
) {
    public static ReminderResponse from(Reminder r) {
        var v = r.getVehicle();
        String label = v.getBrand() + " " + v.getModel() + " " + v.getYear();
        return new ReminderResponse(
            r.getId(),
            v.getId(),
            label,
            v.getLicensePlate(),
            r.getType(),
            r.getCustomLabel(),
            r.getLastServiceKm(),
            r.getLastServiceAt(),
            r.getIntervalKm(),
            r.getIntervalDays(),
            r.getNextKm(),
            r.getNextDate(),
            r.getStatus(),
            r.getNotes()
        );
    }
}
