package rd.dalventa.api.reminder.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.reminder.dto.CreateReminderRequest;
import rd.dalventa.api.reminder.dto.ReminderResponse;
import rd.dalventa.api.reminder.service.ReminderService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
@PreAuthorize("hasAnyRole('OWNER', 'MANAGER', 'RECEPTIONIST', 'SUPER_ADMIN')")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderResponse create(@Valid @RequestBody CreateReminderRequest req) {
        return reminderService.create(req);
    }

    @GetMapping
    public List<ReminderResponse> list(@RequestParam(required = false) UUID vehicleId) {
        return reminderService.list(vehicleId);
    }

    @GetMapping("/due-soon")
    public List<ReminderResponse> dueSoon() {
        return reminderService.dueSoon();
    }

    @PostMapping("/{id}/complete")
    public ReminderResponse markCompleted(@PathVariable UUID id,
                                          @RequestParam(required = false) Integer currentKm) {
        return reminderService.markCompleted(id, currentKm);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        reminderService.delete(id);
    }
}
