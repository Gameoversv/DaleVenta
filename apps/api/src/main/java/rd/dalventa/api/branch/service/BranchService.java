package rd.dalventa.api.branch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.domain.Branch;
import rd.dalventa.api.branch.dto.BranchResponse;
import rd.dalventa.api.branch.dto.CreateBranchRequest;
import rd.dalventa.api.branch.dto.UpdateBranchRequest;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.tenant.repository.TenantRepository;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;
    private final TenantRepository tenantRepository;

    @Transactional
    public BranchResponse create(CreateBranchRequest req) {
        var tenantId = TenantContext.require();
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant no encontrado"));
        if (!tenant.isMultiBranchEnabled() && branchRepository.countByTenantIdAndActiveTrue(tenantId) >= 1) {
            throw new IllegalStateException("El modulo multisucursal no esta activo para este tenant");
        }
        var branch = new Branch(req.name(), req.address());
        branch.setTenantId(tenantId);
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> list() {
        return branchRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(BranchResponse::from).toList();
    }

    @Transactional
    public BranchResponse update(UUID id, UpdateBranchRequest req) {
        var branch = findOwnedBranch(id);
        branch.setName(req.name());
        branch.setAddress(req.address());
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional
    public void deactivate(UUID id) {
        var branch = findOwnedBranch(id);
        branch.deactivate();
        branchRepository.save(branch);
    }

    private Branch findOwnedBranch(UUID id) {
        var tenantId = TenantContext.require();
        return branchRepository.findById(id)
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));
    }
}
