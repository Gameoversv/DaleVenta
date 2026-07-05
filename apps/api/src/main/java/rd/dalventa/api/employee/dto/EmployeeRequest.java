package rd.dalventa.api.employee.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record EmployeeRequest(
        String firstName,
        String lastName,
        String phone,
        String email,
        String role,
        String position,
        LocalDate hireDate,
        BigDecimal salary
) {}
