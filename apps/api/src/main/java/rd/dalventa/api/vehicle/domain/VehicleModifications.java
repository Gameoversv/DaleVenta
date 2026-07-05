package rd.dalventa.api.vehicle.domain;

public record VehicleModifications(
        Boolean turbo,
        String suspension,
        String tune,
        String injectors,
        String fuelType
) {}
