package rd.dalventa.api.workorder.dto;

import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record CreateWorkOrderRequest(
        @NotNull UUID receptionId,
        String diagnosis,
        String assignedTo,
        BigDecimal estimatedCost
) {}
