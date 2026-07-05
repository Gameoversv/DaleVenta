package rd.dalventa.api.inventory.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.inventory.dto.BranchInventoryResponse;
import rd.dalventa.api.inventory.service.InventoryQueryService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryQueryService inventoryQueryService;

    @GetMapping("/branch/{branchId}")
    @PreAuthorize("@permissionService.has('INVENTORY_VIEW')")
    public ApiResponse<List<BranchInventoryResponse>> byBranch(@PathVariable UUID branchId) {
        return ApiResponse.ok(inventoryQueryService.byBranch(branchId));
    }
}
