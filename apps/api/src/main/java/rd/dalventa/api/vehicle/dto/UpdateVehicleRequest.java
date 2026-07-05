package rd.dalventa.api.vehicle.dto;

import jakarta.validation.constraints.*;
import rd.dalventa.api.vehicle.domain.Transmission;

public record UpdateVehicleRequest(
        @Size(max = 100) String brand,
        @Size(max = 100) String model,
        @Min(1900) @Max(2100) Integer year,
        @Size(max = 100) String engine,
        @Size(max = 17) String vin,
        @Size(max = 20) String licensePlate,
        @Size(max = 50) String color,
        @Min(0) Integer mileage,
        Transmission transmission,
        VehicleModificationsDto modifications
) {}
