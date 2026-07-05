package rd.dalventa.api.vehicle.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.vehicle.dto.VehicleResponse;
import rd.dalventa.api.vehicle.service.VehicleService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerVehicleController {

    private final VehicleService service;

    @GetMapping("/{customerId}/vehicles")
    public ApiResponse<List<VehicleResponse>> listByCustomer(@PathVariable UUID customerId) {
        return ApiResponse.ok(service.findByCustomer(customerId));
    }
}
