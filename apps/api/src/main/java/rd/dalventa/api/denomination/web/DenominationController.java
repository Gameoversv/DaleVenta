package rd.dalventa.api.denomination.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.denomination.dto.CreateDenominationRequest;
import rd.dalventa.api.denomination.dto.DenominationResponse;
import rd.dalventa.api.denomination.service.DenominationService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;

@RestController
@RequestMapping("/api/denominations")
@RequiredArgsConstructor
public class DenominationController {

    private final DenominationService denominationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@permissionService.has('SETTINGS_MANAGE')")
    public ApiResponse<DenominationResponse> create(@Valid @RequestBody CreateDenominationRequest req) {
        return ApiResponse.ok(denominationService.create(req));
    }

    @GetMapping
    public ApiResponse<List<DenominationResponse>> list() {
        return ApiResponse.ok(denominationService.list());
    }
}
