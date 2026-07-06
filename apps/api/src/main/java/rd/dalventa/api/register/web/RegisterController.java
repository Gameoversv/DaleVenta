package rd.dalventa.api.register.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.register.dto.CreateRegisterRequest;
import rd.dalventa.api.register.dto.RegisterResponse;
import rd.dalventa.api.register.dto.UpdateRegisterRequest;
import rd.dalventa.api.register.service.RegisterService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/registers")
@RequiredArgsConstructor
public class RegisterController {

    private final RegisterService registerService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<RegisterResponse> create(@Valid @RequestBody CreateRegisterRequest req) {
        return ApiResponse.ok(registerService.create(req));
    }

    @GetMapping
    @PreAuthorize("""
            @permissionService.has('SETTINGS_MANAGE')
            or @permissionService.has('SALE_CREATE')
            or @permissionService.has('SALE_VIEW_HISTORY')
            or @permissionService.has('CASHSHIFT_OPEN')
            or @permissionService.has('CASHSHIFT_VIEW_HISTORY')
            or @permissionService.has('INVENTORY_VIEW')
            or @permissionService.has('REPORTS_VIEW')
            """)
    public ApiResponse<List<RegisterResponse>> listByBranch(@RequestParam UUID branchId) {
        return ApiResponse.ok(registerService.listByBranch(branchId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<RegisterResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateRegisterRequest req) {
        return ApiResponse.ok(registerService.update(id, req));
    }
}
