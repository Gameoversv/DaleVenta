package rd.dalventa.api.branch.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.branch.dto.BranchResponse;
import rd.dalventa.api.branch.dto.CreateBranchRequest;
import rd.dalventa.api.branch.dto.UpdateBranchRequest;
import rd.dalventa.api.branch.service.BranchService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchService branchService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<BranchResponse> create(@Valid @RequestBody CreateBranchRequest req) {
        return ApiResponse.ok(branchService.create(req));
    }

    @GetMapping
    public ApiResponse<List<BranchResponse>> list() {
        return ApiResponse.ok(branchService.list());
    }

    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<BranchResponse> update(@PathVariable UUID id, @Valid @RequestBody UpdateBranchRequest req) {
        return ApiResponse.ok(branchService.update(id, req));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<Void> deactivate(@PathVariable UUID id) {
        branchService.deactivate(id);
        return ApiResponse.ok(null);
    }
}
