package rd.dalventa.api.purchase.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreatePurchaseRequest(
        @NotNull UUID supplierId,
        @NotNull LocalDate purchaseDate,
        String notes,
        @NotEmpty @Valid List<PurchaseItemRequest> items
) {}
