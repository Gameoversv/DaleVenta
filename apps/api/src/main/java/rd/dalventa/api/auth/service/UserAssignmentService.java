package rd.dalventa.api.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.auth.domain.User;
import rd.dalventa.api.auth.domain.UserBranchAssignment;
import rd.dalventa.api.auth.domain.UserRegisterAssignment;
import rd.dalventa.api.auth.dto.UpdateUserAssignmentsRequest;
import rd.dalventa.api.auth.dto.UserAssignmentsResponse;
import rd.dalventa.api.auth.repository.UserBranchAssignmentRepository;
import rd.dalventa.api.auth.repository.UserRegisterAssignmentRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.register.domain.Register;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserAssignmentService {

    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final RegisterRepository registerRepository;
    private final UserBranchAssignmentRepository userBranchAssignmentRepository;
    private final UserRegisterAssignmentRepository userRegisterAssignmentRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public UserAssignmentsResponse get(UUID userId) {
        findTenantStaffUser(userId);
        return responseFor(userId);
    }

    @Transactional
    public UserAssignmentsResponse replace(UUID userId, UpdateUserAssignmentsRequest request) {
        findTenantStaffUser(userId);
        var tenantId = TenantContext.require();
        var branchIds = unique(request.branchIds());
        var registerIds = unique(request.registerIds());

        validateBranches(branchIds, tenantId);
        validateRegisters(registerIds, branchIds, tenantId);

        userRegisterAssignmentRepository.deleteAllByUserId(userId);
        userBranchAssignmentRepository.deleteAllByUserId(userId);
        userBranchAssignmentRepository.saveAll(branchIds.stream()
                .map(branchId -> new UserBranchAssignment(userId, branchId))
                .toList());
        userRegisterAssignmentRepository.saveAll(registerIds.stream()
                .map(registerId -> new UserRegisterAssignment(userId, registerId))
                .toList());

        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        auditLogService.recordEvent(AuditAction.USER_ASSIGNMENTS_UPDATE, "USER", userId, actorId,
                "Sucursales: " + branchIds.size() + ", cajas: " + registerIds.size());

        return new UserAssignmentsResponse(branchIds, registerIds);
    }

    private UserAssignmentsResponse responseFor(UUID userId) {
        var branchIds = userBranchAssignmentRepository.findAllByUserId(userId).stream()
                .map(UserBranchAssignment::getBranchId)
                .toList();
        var registerIds = userRegisterAssignmentRepository.findAllByUserId(userId).stream()
                .map(UserRegisterAssignment::getRegisterId)
                .toList();
        return new UserAssignmentsResponse(branchIds, registerIds);
    }

    private void validateBranches(List<UUID> branchIds, UUID tenantId) {
        var found = branchRepository.findAllById(branchIds).stream()
                .filter(branch -> tenantId.equals(branch.getTenantId()))
                .count();
        if (found != branchIds.size()) {
            throw new ResourceNotFoundException("Una o mas sucursales no existen");
        }
    }

    private void validateRegisters(List<UUID> registerIds, List<UUID> branchIds, UUID tenantId) {
        var branchIdSet = Set.copyOf(branchIds);
        var registers = registerRepository.findAllById(registerIds).stream()
                .filter(register -> tenantId.equals(register.getTenantId()))
                .toList();
        if (registers.size() != registerIds.size()) {
            throw new ResourceNotFoundException("Una o mas cajas no existen");
        }
        if (registers.stream().map(Register::getBranchId).anyMatch(branchId -> !branchIdSet.contains(branchId))) {
            throw new IllegalArgumentException("Cada caja asignada debe pertenecer a una sucursal asignada");
        }
    }

    private User findTenantStaffUser(UUID userId) {
        var tenantId = TenantContext.require();
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (!tenantId.equals(user.getTenantId()) || user.getPrimaryRole() == RoleName.CLIENT) {
            throw new ResourceNotFoundException("Usuario no encontrado");
        }
        return user;
    }

    private static List<UUID> unique(List<UUID> values) {
        return List.copyOf(new LinkedHashSet<>(values));
    }
}
