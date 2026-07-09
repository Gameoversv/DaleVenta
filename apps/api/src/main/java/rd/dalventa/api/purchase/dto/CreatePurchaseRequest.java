package rd.dalventa.api.purchase.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseRequest(
        @JsonProperty("supplierId") @NotNull UUID supplierId,
        @JsonProperty("branchId") @NotNull UUID branchId,
        @JsonProperty("invoiceNumber") String invoiceNumber,
        @JsonProperty("purchasedAt") Instant purchasedAt,
        String notes,
        @Valid List<PurchaseItemRequest> items
) {}
