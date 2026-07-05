package rd.dalventa.api.announcement.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.announcement.domain.PlatformAnnouncement;

import java.util.Optional;
import java.util.UUID;

public interface AnnouncementRepository extends JpaRepository<PlatformAnnouncement, UUID> {

    Optional<PlatformAnnouncement> findTopByOrderByUpdatedAtDesc();
}
