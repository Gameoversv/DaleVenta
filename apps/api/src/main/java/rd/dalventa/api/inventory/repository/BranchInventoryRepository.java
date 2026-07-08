package rd.dalventa.api.inventory.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import rd.dalventa.api.inventory.domain.BranchInventory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BranchInventoryRepository extends JpaRepository<BranchInventory, UUID> {
    Optional<BranchInventory> findByTenantIdAndBranchIdAndProductId(UUID tenantId, UUID branchId, UUID productId);
    List<BranchInventory> findAllByTenantIdAndBranchId(UUID tenantId, UUID branchId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select bi from BranchInventory bi where bi.tenantId = :tenantId and bi.branchId = :branchId and bi.productId = :productId")
    Optional<BranchInventory> lockByTenantIdAndBranchIdAndProductId(UUID tenantId, UUID branchId, UUID productId);

    @Query("select bi from BranchInventory bi where bi.tenantId = :tenantId and bi.branchId = :branchId and bi.minStock is not null and bi.currentStock < bi.minStock")
    List<BranchInventory> findLowStock(UUID tenantId, UUID branchId);

    @Query("select count(bi) from BranchInventory bi where bi.tenantId = :tenantId and bi.minStock is not null and bi.currentStock < bi.minStock")
    long countLowStock(UUID tenantId);
}
