package rd.dalventa.api.workorder.dto;

import rd.dalventa.api.workorder.domain.WorkOrder;
import rd.dalventa.api.workorder.domain.WorkOrderItem;
import rd.dalventa.api.workorder.domain.WorkOrderItemType;
import rd.dalventa.api.workorder.domain.WorkOrderPriority;
import rd.dalventa.api.workorder.domain.WorkOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record WorkOrderResponse(
        UUID id,
        UUID receptionId,
        String vehicleLabel,
        UUID customerId,
        String customerName,
        WorkOrderStatus status,
        WorkOrderPriority priority,
        String diagnosis,
        String assignedTo,
        BigDecimal estimatedCost,
        BigDecimal actualCost,
        Instant startedAt,
        Instant completedAt,
        List<ItemResponse> items,
        Instant createdAt
) {
    public record ItemResponse(
            UUID id,
            String description,
            WorkOrderItemType type,
            BigDecimal quantity,
            BigDecimal unitPrice,
            BigDecimal total
    ) {
        public static ItemResponse from(WorkOrderItem i) {
            return new ItemResponse(i.getId(), i.getDescription(), i.getType(),
                    i.getQuantity(), i.getUnitPrice(), i.getTotal());
        }
    }

    public static WorkOrderResponse from(WorkOrder wo) {
        var reception = wo.getReception();
        var vehicle   = reception.getVehicle();
        var customer  = vehicle.getCustomer();
        String vehicleLabel = vehicle.getBrand() + " " + vehicle.getModel() + " " + vehicle.getYear()
                + (vehicle.getLicensePlate() != null ? " (" + vehicle.getLicensePlate() + ")" : "");
        return new WorkOrderResponse(
                wo.getId(),
                reception.getId(),
                vehicleLabel,
                customer.getId(),
                customer.getFirstName() + " " + customer.getLastName(),
                wo.getStatus(),
                wo.getPriority(),
                wo.getDiagnosis(),
                wo.getAssignedTo(),
                wo.getEstimatedCost(),
                wo.getActualCost(),
                wo.getStartedAt(),
                wo.getCompletedAt(),
                wo.getItems().stream().map(ItemResponse::from).toList(),
                wo.getCreatedAt()
        );
    }
}
