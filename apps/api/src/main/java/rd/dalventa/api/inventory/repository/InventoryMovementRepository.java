package rd.dalventa.api.inventory.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.inventory.domain.InventoryMovement;

import java.util.List;
import java.util.UUID;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {
    List<InventoryMovement> findAllByTenantIdAndBranchInventoryId(UUID tenantId, UUID branchInventoryId);
}
