package rd.dalventa.api.dashboard.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.dashboard.dto.ActivityEvent;
import rd.dalventa.api.dashboard.dto.AlertItem;
import rd.dalventa.api.dashboard.dto.DashboardSummaryResponse;
import rd.dalventa.api.reception.repository.ReceptionRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.vehicle.repository.VehicleRepository;
import rd.dalventa.api.workorder.domain.WorkOrderStatus;
import rd.dalventa.api.workorder.repository.WorkOrderRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final VehicleRepository vehicleRepository;
    private final WorkOrderRepository workOrderRepository;
    private final ReceptionRepository receptionRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        UUID tenantId = TenantContext.require();
        var openStatuses = List.of(WorkOrderStatus.PENDIENTE, WorkOrderStatus.EN_PROGRESO);
        var todayStart = Instant.now().truncatedTo(ChronoUnit.DAYS);

        return new DashboardSummaryResponse(
                workOrderRepository.countByTenantIdAndStatusIn(tenantId, List.of(WorkOrderStatus.EN_PROGRESO)),
                workOrderRepository.countByTenantIdAndStatusIn(tenantId, List.of(WorkOrderStatus.COMPLETADA)),
                workOrderRepository.countByTenantIdAndStatusIn(tenantId, openStatuses),
                workOrderRepository.countByTenantIdAndStatusAndCompletedAtAfter(tenantId, WorkOrderStatus.COMPLETADA, todayStart),
                customerRepository.countByTenantIdAndActiveTrue(tenantId),
                vehicleRepository.countByTenantIdAndActiveTrue(tenantId)
        );
    }

    @Transactional(readOnly = true)
    public List<ActivityEvent> activity() {
        UUID tenantId = TenantContext.require();
        var pageable = PageRequest.of(0, 10, Sort.by("createdAt").descending());
        return receptionRepository.findAllActive(tenantId, pageable)
                .getContent()
                .stream()
                .map(r -> new ActivityEvent(
                        "RECEPTION",
                        r.getVehicle().getCustomer().getFirstName() + " " +
                        r.getVehicle().getCustomer().getLastName() +
                        " – " + r.getVehicle().getBrand() + " " + r.getVehicle().getModel(),
                        r.getId(),
                        r.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AlertItem> alerts() {
        UUID tenantId = TenantContext.require();
        var openStatuses = List.of(WorkOrderStatus.PENDIENTE, WorkOrderStatus.EN_PROGRESO);
        var sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);

        return workOrderRepository.findOverdue(tenantId, openStatuses, sevenDaysAgo)
                .stream()
                .map(wo -> {
                    long days = ChronoUnit.DAYS.between(wo.getCreatedAt(), Instant.now());
                    var vehicle = wo.getReception().getVehicle();
                    return new AlertItem(
                            "OVERDUE_ORDER",
                            vehicle.getBrand() + " " + vehicle.getModel() +
                            " (" + vehicle.getCustomer().getFirstName() + " " +
                            vehicle.getCustomer().getLastName() + ") – " +
                            days + " días sin cerrar",
                            wo.getId(),
                            days
                    );
                })
                .toList();
    }
}
