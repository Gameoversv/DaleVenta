package rd.dalventa.api.vehicle.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.invoice.domain.Invoice;
import rd.dalventa.api.invoice.repository.InvoiceRepository;
import rd.dalventa.api.reception.domain.Reception;
import rd.dalventa.api.reception.repository.ReceptionRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.vehicle.domain.Vehicle;
import rd.dalventa.api.vehicle.dto.VehicleHistoryResponse;
import rd.dalventa.api.vehicle.repository.VehicleRepository;
import rd.dalventa.api.workorder.domain.WorkOrder;
import rd.dalventa.api.workorder.repository.WorkOrderRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VehicleHistoryService {

    private final VehicleRepository vehicleRepository;
    private final ReceptionRepository receptionRepository;
    private final WorkOrderRepository workOrderRepository;
    private final InvoiceRepository invoiceRepository;

    @Transactional(readOnly = true)
    public ApiResponse<VehicleHistoryResponse> getHistory(UUID vehicleId) {
        UUID tenantId = TenantContext.require();
        Vehicle vehicle = vehicleRepository.findByIdAndTenantIdAndActiveTrue(vehicleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado: " + vehicleId));

        List<Reception> receptions = receptionRepository.findByVehicleId(tenantId, vehicleId);

        List<WorkOrder> workOrders = workOrderRepository.findByVehicleIdWithItems(tenantId, vehicleId);
        Map<UUID, WorkOrder> woByReceptionId = workOrders.stream()
                .collect(Collectors.toMap(wo -> wo.getReception().getId(), wo -> wo, (a, b) -> a));

        List<Invoice> invoices = invoiceRepository.findByVehicleId(tenantId, vehicleId);
        Map<UUID, List<Invoice>> invoicesByWoId = invoices.stream()
                .collect(Collectors.groupingBy(inv -> inv.getWorkOrder().getId()));

        List<VehicleHistoryResponse.VisitSummary> visits = receptions.stream()
                .map(r -> {
                    WorkOrder wo = woByReceptionId.get(r.getId());
                    List<Invoice> woInvoices = wo != null
                            ? invoicesByWoId.getOrDefault(wo.getId(), List.of())
                            : List.of();
                    return VehicleHistoryResponse.fromReception(r, wo, woInvoices);
                })
                .toList();

        var customer = vehicle.getCustomer();
        String customerName = customer != null
                ? customer.getFirstName() + " " + customer.getLastName()
                : "—";

        var response = new VehicleHistoryResponse(
                vehicle.getId(),
                vehicle.getLicensePlate(),
                vehicle.getBrand(),
                vehicle.getModel(),
                vehicle.getYear(),
                vehicle.getVin(),
                customerName,
                receptions.size(),
                visits
        );

        return ApiResponse.ok(response);
    }
}
