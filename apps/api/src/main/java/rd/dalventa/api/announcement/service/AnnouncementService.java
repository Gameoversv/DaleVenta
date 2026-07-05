package rd.dalventa.api.announcement.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.announcement.domain.PlatformAnnouncement;
import rd.dalventa.api.announcement.dto.AnnouncementResponse;
import rd.dalventa.api.announcement.dto.UpdateAnnouncementRequest;
import rd.dalventa.api.announcement.repository.AnnouncementRepository;
import rd.dalventa.api.superadmin.domain.AdminAction;
import rd.dalventa.api.superadmin.repository.AdminActionRepository;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository repository;
    private final AdminActionRepository auditRepository;

    /** The banner shown to talleres, only when active. */
    public AnnouncementResponse getActive() {
        return repository.findTopByOrderByUpdatedAtDesc()
                .filter(PlatformAnnouncement::isActive)
                .map(AnnouncementResponse::from)
                .orElse(null);
    }

    /** The current banner in any state, for the super-admin editor. */
    public AnnouncementResponse getCurrent() {
        return repository.findTopByOrderByUpdatedAtDesc()
                .map(AnnouncementResponse::from)
                .orElse(null);
    }

    @Transactional
    public AnnouncementResponse save(UpdateAnnouncementRequest req, String actorEmail) {
        var announcement = repository.findTopByOrderByUpdatedAtDesc()
                .orElseGet(PlatformAnnouncement::new);
        announcement.setMessage(req.message());
        announcement.setLevel(req.level() == null || req.level().isBlank() ? "INFO" : req.level());
        announcement.setActive(req.active());
        repository.save(announcement);

        auditRepository.save(new AdminAction(
                actorEmail,
                "ANNOUNCEMENT",
                null,
                (req.active() ? "Banner global activado: " : "Banner global desactivado: ") + req.message()
        ));
        return AnnouncementResponse.from(announcement);
    }
}
