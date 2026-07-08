package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record OpenCashShiftRequest(
        @JsonProperty("registerId") @NotNull UUID registerId,
        @JsonProperty("openingAmount") BigDecimal openingAmount,
        @JsonProperty("openingCounts") @Valid List<DenominationCountEntry> openingCounts,
        @JsonProperty("inventoryCounts") @Valid List<InventoryCountEntry> inventoryCounts
) {
    public List<DenominationCountEntry> openingCounts() {
        return openingCounts == null ? List.of() : openingCounts;
    }

    public List<InventoryCountEntry> inventoryCounts() {
        return inventoryCounts == null ? List.of() : inventoryCounts;
    }
}
