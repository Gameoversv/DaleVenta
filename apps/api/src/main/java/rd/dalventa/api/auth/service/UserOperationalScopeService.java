package rd.dalventa.api.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.repository.UserBranchAssignmentRepository;
import rd.dalventa.api.auth.repository.UserRegisterAssignmentRepository;
import rd.dalventa.api.branch.domain.Branch;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.register.domain.Register;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Resolves the operational perimeter of a cashier. Administrators retain their tenant-wide
 * management access; cashiers can only see and operate their explicitly assigned locations.
 */
@Service
@RequiredArgsConstructor
public class UserOperationalScopeService {

    private final CurrentUserProvider currentUserProvider;
    private final UserBranchAssignmentRepository userBranchAssignmentRepository;
    private final UserRegisterAssignmentRepository userRegisterAssignmentRepository;
    private final BranchRepository branchRepository;
    private final RegisterRepository registerRepository;

    @Transactional(readOnly = true)
    public List<Branch> visibleBranches() {
        var tenantId = TenantContext.require();
        var user = currentUser();
        var branches = branchRepository.findAllByTenantIdAndActiveTrue(tenantId);
        if (!isRestrictedCashier(user)) {
            return branches;
        }

        var allowedBranchIds = assignedBranchIds(user.getId(), tenantId);
        return branches.stream().filter(branch -> allowedBranchIds.contains(branch.getId())).toList();
    }

    @Transactional(readOnly = true)
    public List<Register> visibleRegisters(UUID branchId) {
        requireBranchAccess(branchId);
        var user = currentUser();
        var registers = registerRepository.findAllByBranchIdAndActiveTrue(branchId);
        if (!isRestrictedCashier(user)) {
            return registers;
        }

        var assignedRegisterIds = assignedRegisterIds(user.getId());
        return registers.stream().filter(register -> assignedRegisterIds.contains(register.getId())).toList();
    }

    @Transactional(readOnly = true)
    public Branch requireBranchAccess(UUID branchId) {
        var tenantId = TenantContext.require();
        var branch = branchRepository.findById(branchId)
                .filter(candidate -> candidate.getTenantId().equals(tenantId))
                .orElseThrow(() -> new ResourceNotFoundException("Sucursal no encontrada"));
        var user = currentUser();
        if (isRestrictedCashier(user) && !assignedBranchIds(user.getId(), tenantId).contains(branchId)) {
            throw new ResourceNotFoundException("Sucursal no encontrada");
        }
        return branch;
    }

    @Transactional(readOnly = true)
    public Register requireRegisterAccess(UUID registerId) {
        var tenantId = TenantContext.require();
        var register = registerRepository.findByIdAndTenantId(registerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));
        var user = currentUser();
        if (isRestrictedCashier(user)
                && !userRegisterAssignmentRepository.existsByUserIdAndRegisterId(user.getId(), registerId)) {
            throw new ResourceNotFoundException("Caja no encontrada");
        }
        return register;
    }

    private Set<UUID> assignedBranchIds(UUID userId, UUID tenantId) {
        var ids = new HashSet<UUID>();
        userBranchAssignmentRepository.findAllByUserId(userId)
                .forEach(assignment -> ids.add(assignment.getBranchId()));
        var registerIds = assignedRegisterIds(userId);
        if (!registerIds.isEmpty()) {
            registerRepository.findAllById(registerIds).stream()
                    .filter(register -> tenantId.equals(register.getTenantId()))
                    .map(Register::getBranchId)
                    .forEach(ids::add);
        }
        return ids;
    }

    private Set<UUID> assignedRegisterIds(UUID userId) {
        var ids = new HashSet<UUID>();
        userRegisterAssignmentRepository.findAllByUserId(userId)
                .forEach(assignment -> ids.add(assignment.getRegisterId()));
        return ids;
    }

    private User currentUser() {
        return currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"));
    }

    private static boolean isRestrictedCashier(User user) {
        return user.getPrimaryRole() == RoleName.CASHIER;
    }
}
