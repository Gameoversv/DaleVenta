package rd.dalventa.api.reminder.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.reminder.domain.ReminderType;

import java.time.LocalDate;
import java.util.UUID;

public record CreateReminderRequest(
    @NotNull UUID vehicleId,
    @NotNull ReminderType type,
    String customLabel,
    Integer lastServiceKm,
    LocalDate lastServiceAt,
    Integer intervalKm,
    Integer intervalDays,
    String notes
) {}
