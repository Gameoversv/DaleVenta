package rd.dalventa.api.vehicle.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.vehicle.domain.Vehicle;
import rd.dalventa.api.vehicle.domain.VehicleModifications;
import rd.dalventa.api.vehicle.dto.CreateVehicleRequest;
import rd.dalventa.api.vehicle.dto.UpdateVehicleRequest;
import rd.dalventa.api.vehicle.dto.VehicleResponse;
import rd.dalventa.api.vehicle.repository.VehicleRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Page<VehicleResponse> search(UUID customerId, String q, Pageable pageable) {
        return vehicleRepository.search(TenantContext.require(), customerId, q, pageable)
                .map(VehicleResponse::from);
    }

    @Transactional(readOnly = true)
    public VehicleResponse findById(UUID id) {
        return vehicleRepository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .map(VehicleResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado: " + id));
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> findByCustomer(UUID customerId) {
        UUID tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + customerId));
        return vehicleRepository.findByCustomerIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .stream().map(VehicleResponse::from).toList();
    }

    @Transactional
    public VehicleResponse create(CreateVehicleRequest req) {
        UUID tenantId = TenantContext.require();
        if (req.vin() != null && !req.vin().isBlank()
                && vehicleRepository.existsByVinAndTenantIdAndActiveTrue(req.vin(), tenantId)) {
            throw new IllegalArgumentException("Ya existe un vehículo con ese VIN");
        }
        if (req.licensePlate() != null && !req.licensePlate().isBlank()
                && vehicleRepository.existsByLicensePlateAndTenantIdAndActiveTrue(req.licensePlate(), tenantId)) {
            throw new IllegalArgumentException("Ya existe un vehículo con esa placa");
        }

        var customer = customerRepository.findByIdAndTenantIdAndActiveTrue(req.customerId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + req.customerId()));

        var vehicle = new Vehicle();
        vehicle.setTenantId(tenantId);
        vehicle.setBrand(req.brand());
        vehicle.setModel(req.model());
        vehicle.setYear(req.year());
        vehicle.setEngine(req.engine());
        vehicle.setVin(req.vin());
        vehicle.setLicensePlate(req.licensePlate());
        vehicle.setColor(req.color());
        vehicle.setMileage(req.mileage());
        vehicle.setTransmission(req.transmission());
        vehicle.setModifications(toModificationsDomain(req.modifications()));
        vehicle.setCustomer(customer);

        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    @Transactional
    public VehicleResponse update(UUID id, UpdateVehicleRequest req) {
        var vehicle = vehicleRepository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado: " + id));

        if (req.brand() != null) vehicle.setBrand(req.brand());
        if (req.model() != null) vehicle.setModel(req.model());
        if (req.year() != null) vehicle.setYear(req.year());
        if (req.engine() != null) vehicle.setEngine(req.engine());
        if (req.vin() != null) vehicle.setVin(req.vin());
        if (req.licensePlate() != null) vehicle.setLicensePlate(req.licensePlate());
        if (req.color() != null) vehicle.setColor(req.color());
        if (req.mileage() != null) vehicle.setMileage(req.mileage());
        if (req.transmission() != null) vehicle.setTransmission(req.transmission());
        if (req.modifications() != null) vehicle.setModifications(toModificationsDomain(req.modifications()));

        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    @Transactional
    public void delete(UUID id) {
        var vehicle = vehicleRepository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado: " + id));
        vehicle.setActive(false);
        vehicleRepository.save(vehicle);
    }

    private VehicleModifications toModificationsDomain(
            rd.dalventa.api.vehicle.dto.VehicleModificationsDto dto) {
        if (dto == null) return null;
        return new VehicleModifications(
                dto.turbo(), dto.suspension(), dto.tune(), dto.injectors(), dto.fuelType());
    }
}
