package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;

import java.math.BigDecimal;
import java.util.List;

public record CloseCashShiftRequest(
        @JsonProperty("countedCash") BigDecimal countedCash,
        @JsonProperty("closingCounts") @Valid List<DenominationCountEntry> closingCounts,
        @JsonProperty("closingNotes") String closingNotes,
        @JsonProperty("inventoryCounts") @Valid List<InventoryCountEntry> inventoryCounts
) {
    public List<DenominationCountEntry> closingCounts() {
        return closingCounts == null ? List.of() : closingCounts;
    }

    public List<InventoryCountEntry> inventoryCounts() {
        return inventoryCounts == null ? List.of() : inventoryCounts;
    }
}
