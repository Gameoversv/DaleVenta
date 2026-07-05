package rd.dalventa.api.employee.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.employee.domain.Employee;

import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    Page<Employee> findByTenantIdAndActiveAndRoleOrderByLastNameAscFirstNameAsc(
            java.util.UUID tenantId, boolean active, RoleName role, Pageable pageable);

    Page<Employee> findByTenantIdAndActiveOrderByLastNameAscFirstNameAsc(
            java.util.UUID tenantId, boolean active, Pageable pageable);

    Page<Employee> findByTenantIdOrderByLastNameAscFirstNameAsc(java.util.UUID tenantId, Pageable pageable);

    java.util.Optional<Employee> findByIdAndTenantId(java.util.UUID id, java.util.UUID tenantId);
}
