package rd.dalventa.api.employee.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.employee.dto.EmployeeRequest;
import rd.dalventa.api.employee.dto.EmployeeResponse;
import rd.dalventa.api.employee.service.EmployeeService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<EmployeeResponse>>> list(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(employeeService.list(role, active, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(employeeService.findById(id));
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> create(@RequestBody EmployeeRequest req) {
        return ResponseEntity.ok(employeeService.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponse> update(@PathVariable UUID id, @RequestBody EmployeeRequest req) {
        return ResponseEntity.ok(employeeService.update(id, req));
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<Void> toggleActive(@PathVariable UUID id) {
        employeeService.toggleActive(id);
        return ResponseEntity.noContent().build();
    }
}
