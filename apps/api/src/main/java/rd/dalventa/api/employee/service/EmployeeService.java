package rd.dalventa.api.employee.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.employee.domain.Employee;
import rd.dalventa.api.employee.dto.EmployeeRequest;
import rd.dalventa.api.employee.dto.EmployeeResponse;
import rd.dalventa.api.employee.repository.EmployeeRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository employeeRepository;

    @Transactional(readOnly = true)
    public ApiResponse<List<EmployeeResponse>> list(String role, Boolean active, int page, int size) {
        UUID tenantId = TenantContext.require();
        var pageable = PageRequest.of(page, size);

        var result = (role != null && active != null)
                ? employeeRepository.findByTenantIdAndActiveAndRoleOrderByLastNameAscFirstNameAsc(
                        tenantId, active, RoleName.valueOf(role), pageable)
                : (active != null)
                ? employeeRepository.findByTenantIdAndActiveOrderByLastNameAscFirstNameAsc(tenantId, active, pageable)
                : employeeRepository.findByTenantIdOrderByLastNameAscFirstNameAsc(tenantId, pageable);

        var data = result.getContent().stream().map(EmployeeResponse::from).toList();
        return ApiResponse.paged(data, result.getTotalElements(), page, size);
    }

    @Transactional(readOnly = true)
    public EmployeeResponse findById(UUID id) {
        return employeeRepository.findByIdAndTenantId(id, TenantContext.require())
                .map(EmployeeResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Empleado no encontrado: " + id));
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest req) {
        validate(req);
        UUID tenantId = TenantContext.require();
        var employee = new Employee();
        employee.setTenantId(tenantId);
        applyRequest(employee, req);
        var saved = employeeRepository.saveAndFlush(employee);
        return EmployeeResponse.from(employeeRepository.findById(saved.getId()).orElse(saved));
    }

    @Transactional
    public EmployeeResponse update(UUID id, EmployeeRequest req) {
        validate(req);
        var employee = employeeRepository.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Empleado no encontrado: " + id));
        applyRequest(employee, req);
        return EmployeeResponse.from(employeeRepository.save(employee));
    }

    @Transactional
    public void toggleActive(UUID id) {
        var employee = employeeRepository.findByIdAndTenantId(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Empleado no encontrado: " + id));
        employee.setActive(!employee.isActive());
        employeeRepository.save(employee);
    }

    private void applyRequest(Employee e, EmployeeRequest req) {
        e.setFirstName(req.firstName().trim());
        e.setLastName(req.lastName().trim());
        e.setPhone(req.phone());
        e.setEmail(req.email());
        e.setRole(RoleName.valueOf(req.role()));
        e.setPosition(req.position());
        e.setHireDate(req.hireDate());
        e.setSalary(req.salary());
    }

    private void validate(EmployeeRequest req) {
        if (req.firstName() == null || req.firstName().isBlank())
            throw new IllegalArgumentException("Nombre requerido");
        if (req.lastName() == null || req.lastName().isBlank())
            throw new IllegalArgumentException("Apellido requerido");
        if (req.role() == null)
            throw new IllegalArgumentException("Rol requerido");
        try { RoleName.valueOf(req.role()); }
        catch (IllegalArgumentException e) { throw new IllegalArgumentException("Rol inválido: " + req.role()); }
    }
}
