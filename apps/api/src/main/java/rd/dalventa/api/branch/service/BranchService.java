package rd.dalventa.api.branch.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.branch.domain.Branch;
import rd.dalventa.api.branch.dto.BranchResponse;
import rd.dalventa.api.branch.dto.CreateBranchRequest;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BranchService {

    private final BranchRepository branchRepository;

    @Transactional
    public BranchResponse create(CreateBranchRequest req) {
        var branch = new Branch(req.name(), req.address());
        branch.setTenantId(TenantContext.require());
        return BranchResponse.from(branchRepository.save(branch));
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> list() {
        return branchRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(BranchResponse::from).toList();
    }

    @Transactional
    public void deactivate(UUID id) {
        var branch = branchRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada"));
        if (!branch.getTenantId().equals(TenantContext.require())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Sucursal no encontrada");
        }
        branch.deactivate();
        branchRepository.save(branch);
    }
}
