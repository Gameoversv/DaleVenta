package rd.dalventa.api.vehicle.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.reception.dto.ReceptionResponse;
import rd.dalventa.api.reception.service.ReceptionService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleReceptionController {

    private final ReceptionService receptionService;

    @GetMapping("/{vehicleId}/receptions")
    public ApiResponse<List<ReceptionResponse>> listByVehicle(@PathVariable UUID vehicleId) {
        return ApiResponse.ok(receptionService.findByVehicle(vehicleId));
    }
}
