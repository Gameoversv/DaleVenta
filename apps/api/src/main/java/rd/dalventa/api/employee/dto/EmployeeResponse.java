package rd.dalventa.api.employee.dto;

import rd.dalventa.api.employee.domain.Employee;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EmployeeResponse(
        UUID id,
        String firstName,
        String lastName,
        String fullName,
        String phone,
        String email,
        String role,
        String position,
        LocalDate hireDate,
        BigDecimal salary,
        boolean active,
        String createdAt
) {
    public static EmployeeResponse from(Employee e) {
        return new EmployeeResponse(
                e.getId(),
                e.getFirstName(),
                e.getLastName(),
                e.getFirstName() + " " + e.getLastName(),
                e.getPhone(),
                e.getEmail(),
                e.getRole().name(),
                e.getPosition(),
                e.getHireDate(),
                e.getSalary(),
                e.isActive(),
                e.getCreatedAt() != null ? e.getCreatedAt().toString() : null
        );
    }
}
