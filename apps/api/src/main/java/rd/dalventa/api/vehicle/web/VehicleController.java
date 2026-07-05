package rd.dalventa.api.vehicle.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.vehicle.dto.CreateVehicleRequest;
import rd.dalventa.api.vehicle.dto.UpdateVehicleRequest;
import rd.dalventa.api.vehicle.dto.VehicleHistoryResponse;
import rd.dalventa.api.vehicle.dto.VehicleResponse;
import rd.dalventa.api.vehicle.service.VehicleHistoryService;
import rd.dalventa.api.vehicle.service.VehicleService;

import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {

    private final VehicleHistoryService vehicleHistoryService;

    private final VehicleService service;

    @GetMapping
    public ApiResponse<Iterable<VehicleResponse>> list(
            @RequestParam(required = false) UUID customerId,
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var pageable = PageRequest.of(page, size, Sort.by("brand", "model"));
        var result = service.search(customerId, q, pageable);
        return ApiResponse.paged(result.getContent(), result.getTotalElements(), page, size);
    }

    @GetMapping("/{id}")
    public ApiResponse<VehicleResponse> get(@PathVariable UUID id) {
        return ApiResponse.ok(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<VehicleResponse> create(@Valid @RequestBody CreateVehicleRequest req) {
        return ApiResponse.ok(service.create(req));
    }

    @PutMapping("/{id}")
    public ApiResponse<VehicleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVehicleRequest req
    ) {
        return ApiResponse.ok(service.update(id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/{id}/history")
    public ApiResponse<VehicleHistoryResponse> history(@PathVariable UUID id) {
        return vehicleHistoryService.getHistory(id);
    }
}
