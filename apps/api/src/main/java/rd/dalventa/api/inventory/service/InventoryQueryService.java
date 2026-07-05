package rd.dalventa.api.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.inventory.dto.BranchInventoryResponse;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class InventoryQueryService {

    private final BranchInventoryRepository branchInventoryRepository;
    private final BranchRepository branchRepository;

    @Transactional(readOnly = true)
    public List<BranchInventoryResponse> byBranch(UUID branchId) {
        var tenantId = requireBranchInTenant(branchId);
        return branchInventoryRepository.findAllByTenantIdAndBranchId(tenantId, branchId)
                .stream().map(BranchInventoryResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public List<BranchInventoryResponse> lowStock(UUID branchId) {
        var tenantId = requireBranchInTenant(branchId);
        return branchInventoryRepository.findLowStock(tenantId, branchId)
                .stream().map(BranchInventoryResponse::from).toList();
    }

    private UUID requireBranchInTenant(UUID branchId) {
        var tenantId = TenantContext.require();
        branchRepository.findById(branchId)
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));
        return tenantId;
    }
}
