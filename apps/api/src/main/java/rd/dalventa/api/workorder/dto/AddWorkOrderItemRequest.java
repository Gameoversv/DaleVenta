package rd.dalventa.api.workorder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import rd.dalventa.api.workorder.domain.WorkOrderItemType;

import java.math.BigDecimal;

public record AddWorkOrderItemRequest(
        @NotBlank String description,
        @NotNull WorkOrderItemType type,
        @NotNull @Positive BigDecimal quantity,
        @NotNull @Positive BigDecimal unitPrice
) {}
