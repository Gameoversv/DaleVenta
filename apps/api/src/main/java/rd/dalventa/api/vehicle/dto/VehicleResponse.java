package rd.dalventa.api.vehicle.dto;

import rd.dalventa.api.vehicle.domain.Transmission;
import rd.dalventa.api.vehicle.domain.Vehicle;

import java.time.Instant;
import java.util.UUID;

public record VehicleResponse(
        UUID id,
        String brand,
        String model,
        Integer year,
        String engine,
        String vin,
        String licensePlate,
        String color,
        Integer mileage,
        Transmission transmission,
        VehicleModificationsDto modifications,
        UUID customerId,
        String customerName,
        boolean active,
        Instant createdAt
) {
    public static VehicleResponse from(Vehicle v) {
        var mods = v.getModifications();
        VehicleModificationsDto modsDto = mods == null ? null : new VehicleModificationsDto(
                mods.turbo(),
                mods.suspension(),
                mods.tune(),
                mods.injectors(),
                mods.fuelType()
        );
        return new VehicleResponse(
                v.getId(),
                v.getBrand(),
                v.getModel(),
                v.getYear(),
                v.getEngine(),
                v.getVin(),
                v.getLicensePlate(),
                v.getColor(),
                v.getMileage(),
                v.getTransmission(),
                modsDto,
                v.getCustomer().getId(),
                v.getCustomer().getFirstName() + " " + v.getCustomer().getLastName(),
                v.isActive(),
                v.getCreatedAt()
        );
    }
}
