package rd.dalventa.api.fiscal.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;

import java.time.LocalDate;

public record FiscalReceiptSequenceRequest(
        @NotNull FiscalReceiptType receiptType,
        @Size(min = 3, max = 5) String prefix,
        @Min(1) @Max(99999999) int startNumber,
        @Min(1) @Max(99999999) int nextNumber,
        @Min(1) @Max(99999999) int endNumber,
        @NotNull @FutureOrPresent LocalDate expiresAt,
        boolean active
) {
}
