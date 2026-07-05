package rd.dalventa.api.portal.dto;

import rd.dalventa.api.vehicle.domain.Vehicle;

import java.util.UUID;

public record PortalVehicleResponse(
        UUID id,
        String brand,
        String model,
        Integer year,
        String licensePlate,
        String color,
        Integer mileage
) {
    public static PortalVehicleResponse from(Vehicle v) {
        return new PortalVehicleResponse(
                v.getId(),
                v.getBrand(),
                v.getModel(),
                v.getYear(),
                v.getLicensePlate(),
                v.getColor(),
                v.getMileage()
        );
    }
}
