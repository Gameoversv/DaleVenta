package rd.dalventa.api.rental.web;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.rental.dto.RentalContractResponse;
import rd.dalventa.api.rental.service.RentalService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/rentals")
@RequiredArgsConstructor
public class RentalController {

    private final RentalService rentalService;

    @GetMapping
    @PreAuthorize("@permissionService.has('SALE_VIEW_HISTORY') or @permissionService.has('SALE_CREATE')")
    public ApiResponse<List<RentalContractResponse>> list() {
        return ApiResponse.ok(rentalService.list());
    }
}
