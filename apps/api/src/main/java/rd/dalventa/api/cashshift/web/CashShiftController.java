package rd.dalventa.api.cashshift.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.cashshift.dto.CashMovementResponse;
import rd.dalventa.api.cashshift.dto.CashShiftSummaryResponse;
import rd.dalventa.api.cashshift.dto.CreateCashMovementRequest;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
import rd.dalventa.api.cashshift.service.CashMovementService;
import rd.dalventa.api.cashshift.service.CashShiftService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.UUID;

@RestController
@RequestMapping("/api/cash-shifts")
@RequiredArgsConstructor
public class CashShiftController {

    private final CashShiftService cashShiftService;
    private final CashMovementService cashMovementService;

    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> open(@Valid @RequestBody OpenCashShiftRequest req) {
        return ApiResponse.ok(cashShiftService.open(req));
    }

    @GetMapping("/{id}/summary")
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> summary(@PathVariable UUID id) {
        return ApiResponse.ok(cashShiftService.getSummary(id));
    }

    @PostMapping("/{id}/movements")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashMovementResponse> recordMovement(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCashMovementRequest req) {
        return ApiResponse.ok(cashMovementService.recordMovement(id, req));
    }
}
