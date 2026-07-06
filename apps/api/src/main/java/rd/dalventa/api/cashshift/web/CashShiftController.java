package rd.dalventa.api.cashshift.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.cashshift.dto.CashMovementResponse;
import rd.dalventa.api.cashshift.dto.CashShiftSummaryResponse;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionRequest;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionResponse;
import rd.dalventa.api.cashshift.dto.CloseCashShiftRequest;
import rd.dalventa.api.cashshift.dto.CreateCashMovementRequest;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
import rd.dalventa.api.cashshift.service.CashMovementService;
import rd.dalventa.api.cashshift.service.CashShiftChangeService;
import rd.dalventa.api.cashshift.service.CashShiftService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cash-shifts")
@RequiredArgsConstructor
public class CashShiftController {

    private final CashShiftService cashShiftService;
    private final CashMovementService cashMovementService;
    private final CashShiftChangeService cashShiftChangeService;

    @PostMapping("/open")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> open(@Valid @RequestBody OpenCashShiftRequest req) {
        return ApiResponse.ok(cashShiftService.open(req));
    }

    @GetMapping("/current")
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<CashShiftSummaryResponse> current(@RequestParam UUID registerId) {
        return ApiResponse.ok(cashShiftService.getCurrentOpenShift(registerId));
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

    @PostMapping("/change-suggestion")
    @PreAuthorize("@permissionService.has('CASHSHIFT_OPEN')")
    public ApiResponse<ChangeSuggestionResponse> changeSuggestion(@Valid @RequestBody ChangeSuggestionRequest req) {
        return ApiResponse.ok(cashShiftChangeService.suggest(req));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("@permissionService.has('CASHSHIFT_CLOSE')")
    public ApiResponse<CashShiftSummaryResponse> close(
            @PathVariable UUID id,
            @Valid @RequestBody CloseCashShiftRequest req) {
        return ApiResponse.ok(cashShiftService.close(id, req));
    }

    @GetMapping
    @PreAuthorize("@permissionService.has('CASHSHIFT_VIEW_HISTORY')")
    public ApiResponse<List<CashShiftSummaryResponse>> list(@RequestParam UUID registerId) {
        return ApiResponse.ok(cashShiftService.list(registerId));
    }
}
