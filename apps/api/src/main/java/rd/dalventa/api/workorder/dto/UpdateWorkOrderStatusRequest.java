package rd.dalventa.api.workorder.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.workorder.domain.WorkOrderStatus;

public record UpdateWorkOrderStatusRequest(
        @NotNull WorkOrderStatus status
) {}
