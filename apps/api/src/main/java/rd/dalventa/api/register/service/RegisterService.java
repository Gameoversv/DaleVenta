package rd.dalventa.api.register.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.register.domain.Register;
import rd.dalventa.api.register.dto.CreateRegisterRequest;
import rd.dalventa.api.register.dto.RegisterResponse;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegisterService {

    private final RegisterRepository registerRepository;
    private final BranchRepository branchRepository;

    @Transactional
    public RegisterResponse create(CreateRegisterRequest req) {
        var tenantId = TenantContext.require();
        var branchId = UUID.fromString(req.branchId());
        var branch = branchRepository.findById(branchId)
                .filter(b -> b.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));

        var register = new Register(req.name(), branch.getId());
        register.setTenantId(tenantId);
        return RegisterResponse.from(registerRepository.save(register));
    }

    @Transactional(readOnly = true)
    public List<RegisterResponse> listByBranch(UUID branchId) {
        return registerRepository.findAllByBranchIdAndActiveTrue(branchId)
                .stream().map(RegisterResponse::from).toList();
    }
}
