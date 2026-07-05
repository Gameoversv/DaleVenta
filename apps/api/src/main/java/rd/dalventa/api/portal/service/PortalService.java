package rd.dalventa.api.portal.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.invoice.dto.InvoiceResponse;
import rd.dalventa.api.invoice.repository.InvoiceRepository;
import rd.dalventa.api.payment.repository.PaymentRepository;
import rd.dalventa.api.portal.dto.PortalInvoiceResponse;
import rd.dalventa.api.portal.dto.PortalVehicleResponse;
import rd.dalventa.api.shared.domain.CustomerContext;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.vehicle.dto.VehicleHistoryResponse;
import rd.dalventa.api.vehicle.repository.VehicleRepository;
import rd.dalventa.api.vehicle.service.VehicleHistoryService;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PortalService {

    private final VehicleRepository vehicleRepository;
    private final VehicleHistoryService vehicleHistoryService;
    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public List<PortalVehicleResponse> getCustomerVehicles() {
        UUID tenantId = TenantContext.require();
        UUID customerId = CustomerContext.require();
        return vehicleRepository.findByCustomerIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .stream()
                .map(PortalVehicleResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public VehicleHistoryResponse getVehicleHistory(UUID vehicleId) {
        UUID tenantId = TenantContext.require();
        UUID customerId = CustomerContext.require();

        var vehicle = vehicleRepository.findByIdAndTenantIdAndActiveTrue(vehicleId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Vehículo no encontrado"));

        // Ownership check — prevent CLIENT from accessing other customers' vehicles
        var owner = vehicle.getCustomer();
        if (owner == null || !owner.getId().equals(customerId)) {
            throw new ResourceNotFoundException("Vehículo no encontrado");
        }

        return vehicleHistoryService.getHistory(vehicleId).data();
    }

    @Transactional(readOnly = true)
    public List<PortalInvoiceResponse> getCustomerInvoices() {
        UUID tenantId = TenantContext.require();
        UUID customerId = CustomerContext.require();

        List<UUID> vehicleIds = vehicleRepository
                .findByCustomerIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .stream()
                .map(v -> v.getId())
                .toList();

        return vehicleIds.stream()
                .flatMap(vid -> invoiceRepository.findByVehicleId(tenantId, vid).stream())
                .map(PortalInvoiceResponse::from)
                .sorted((a, b) -> b.issueDate().compareTo(a.issueDate()))
                .toList();
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getInvoiceDetail(UUID invoiceId) {
        UUID tenantId = TenantContext.require();
        UUID customerId = CustomerContext.require();

        var invoice = invoiceRepository.findByIdWithDetails(invoiceId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada"));

        UUID vehicleCustomerId = invoice.getWorkOrder().getReception().getVehicle().getCustomer().getId();
        if (!vehicleCustomerId.equals(customerId)) {
            throw new ResourceNotFoundException("Factura no encontrada");
        }

        var paidAmount = paymentRepository.sumAmountByInvoiceId(invoiceId);
        return InvoiceResponse.from(invoice, paidAmount);
    }
}
