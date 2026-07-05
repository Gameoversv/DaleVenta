package rd.dalventa.api.workorder.dto;

import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.workorder.domain.WorkOrderPriority;

public record UpdateDiagnosticRequest(
        String diagnosis,
        @NotNull WorkOrderPriority priority
) {}
