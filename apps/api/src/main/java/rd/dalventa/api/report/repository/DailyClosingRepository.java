package rd.dalventa.api.report.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.report.domain.DailyClosing;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface DailyClosingRepository extends JpaRepository<DailyClosing, UUID> {
    List<DailyClosing> findAllByTenantIdOrderByCloseDateDescClosedAtDesc(UUID tenantId);
    boolean existsByTenantIdAndCloseDateAndRegisterId(UUID tenantId, LocalDate closeDate, UUID registerId);

    @Query("select coalesce(max(d.closeSequence), 0) from DailyClosing d where d.tenantId = :tenantId")
    long maxCloseSequence(UUID tenantId);
}
