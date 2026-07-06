package rd.dalventa.api.cashshift.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.cashshift.domain.ShiftInventoryCount;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ShiftInventoryCountRepository extends JpaRepository<ShiftInventoryCount, UUID> {
    List<ShiftInventoryCount> findAllByCashShiftId(UUID cashShiftId);
    Optional<ShiftInventoryCount> findByCashShiftIdAndProductId(UUID cashShiftId, UUID productId);
}
