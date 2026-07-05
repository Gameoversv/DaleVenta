package rd.dalventa.api.reminder.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.reminder.domain.Reminder;
import rd.dalventa.api.reminder.domain.ReminderStatus;
import rd.dalventa.api.reminder.domain.ReminderType;
import rd.dalventa.api.reminder.dto.CreateReminderRequest;
import rd.dalventa.api.reminder.dto.ReminderResponse;
import rd.dalventa.api.reminder.repository.ReminderRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.vehicle.repository.VehicleRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReminderService {

    private static final int DUE_SOON_DAYS = 14;

    private final ReminderRepository reminderRepository;
    private final VehicleRepository vehicleRepository;

    @Transactional
    public ReminderResponse create(CreateReminderRequest req) {
        UUID tenantId = TenantContext.require();
        var vehicle = vehicleRepository.findByIdAndTenantIdAndActiveTrue(req.vehicleId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Vehicle not found"));

        var reminder = new Reminder();
        reminder.setTenantId(tenantId);
        reminder.setVehicle(vehicle);
        reminder.setType(req.type());
        reminder.setCustomLabel(req.customLabel());
        reminder.setLastServiceKm(req.lastServiceKm());
        reminder.setLastServiceAt(req.lastServiceAt());
        reminder.setIntervalKm(req.intervalKm());
        reminder.setIntervalDays(req.intervalDays());
        reminder.setNotes(req.notes());

        computeNextValues(reminder);
        updateStatus(reminder, LocalDate.now());

        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> list(UUID vehicleId) {
        UUID tenantId = TenantContext.require();
        List<Reminder> results = vehicleId != null
                ? reminderRepository.findByTenantIdAndVehicle_IdAndActiveTrue(tenantId, vehicleId)
                : reminderRepository.findByTenantIdAndActiveTrue(tenantId);
        return results.stream().map(ReminderResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> dueSoon() {
        UUID tenantId = TenantContext.require();
        LocalDate threshold = LocalDate.now().plusDays(DUE_SOON_DAYS);
        return reminderRepository.findDueSoon(tenantId, threshold)
                .stream().map(ReminderResponse::from).toList();
    }

    @Transactional
    public ReminderResponse markCompleted(UUID id, Integer currentKm) {
        UUID tenantId = TenantContext.require();
        var reminder = reminderRepository.findByIdAndTenantIdAndActiveTrue(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Reminder not found"));

        reminder.setLastServiceAt(LocalDate.now());
        if (currentKm != null) reminder.setLastServiceKm(currentKm);
        reminder.setStatus(ReminderStatus.COMPLETED);
        computeNextValues(reminder);

        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    @Transactional
    public void delete(UUID id) {
        UUID tenantId = TenantContext.require();
        var reminder = reminderRepository.findByIdAndTenantIdAndActiveTrue(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Reminder not found"));
        reminder.setActive(false);
        reminderRepository.save(reminder);
    }

    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void refreshStatuses() {
        LocalDate today = LocalDate.now();
        LocalDate dueSoonThreshold = today.plusDays(DUE_SOON_DAYS);
        List<Reminder> reminders = reminderRepository.findAllActiveNotCompleted();
        for (Reminder r : reminders) {
            updateStatus(r, today);
            if (r.getNextDate() != null && !r.getNextDate().isAfter(dueSoonThreshold)) {
                log.info("Reminder due soon: vehicle={} type={} nextDate={}",
                        r.getVehicle().getLicensePlate(), r.getType(), r.getNextDate());
            }
        }
        reminderRepository.saveAll(reminders);
    }

    private void computeNextValues(Reminder r) {
        if (r.getLastServiceAt() != null && r.getIntervalDays() != null) {
            r.setNextDate(r.getLastServiceAt().plusDays(r.getIntervalDays()));
        }
        if (r.getLastServiceKm() != null && r.getIntervalKm() != null) {
            r.setNextKm(r.getLastServiceKm() + r.getIntervalKm());
        }
    }

    private void updateStatus(Reminder r, LocalDate today) {
        if (r.getStatus() == ReminderStatus.COMPLETED) return;
        if (r.getNextDate() == null) {
            r.setStatus(ReminderStatus.UPCOMING);
            return;
        }
        LocalDate dueSoonThreshold = today.plusDays(DUE_SOON_DAYS);
        if (r.getNextDate().isBefore(today)) {
            r.setStatus(ReminderStatus.OVERDUE);
        } else if (!r.getNextDate().isAfter(dueSoonThreshold)) {
            r.setStatus(ReminderStatus.DUE_SOON);
        } else {
            r.setStatus(ReminderStatus.UPCOMING);
        }
    }
}
