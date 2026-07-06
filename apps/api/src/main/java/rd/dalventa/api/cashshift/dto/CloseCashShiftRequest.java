package rd.dalventa.api.cashshift.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CloseCashShiftRequest(
        @JsonProperty("closingCounts") @NotEmpty @Valid List<DenominationCountEntry> closingCounts,
        @JsonProperty("closingNotes") String closingNotes,
        @JsonProperty("inventoryCounts") @Valid List<InventoryCountEntry> inventoryCounts
) {
    public List<InventoryCountEntry> inventoryCounts() {
        return inventoryCounts == null ? List.of() : inventoryCounts;
    }
}
