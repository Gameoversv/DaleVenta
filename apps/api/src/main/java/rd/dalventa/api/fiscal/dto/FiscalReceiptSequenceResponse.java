package rd.dalventa.api.fiscal.dto;

import rd.dalventa.api.fiscal.domain.FiscalReceiptSequence;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;

import java.time.LocalDate;
import java.util.UUID;

public record FiscalReceiptSequenceResponse(
        UUID id,
        FiscalReceiptType receiptType,
        String prefix,
        int startNumber,
        int nextNumber,
        int endNumber,
        LocalDate expiresAt,
        boolean active,
        String nextNcf,
        int remaining
) {
    public static FiscalReceiptSequenceResponse from(FiscalReceiptSequence sequence) {
        return new FiscalReceiptSequenceResponse(
                sequence.getId(),
                sequence.getReceiptType(),
                sequence.getPrefix(),
                sequence.getStartNumber(),
                sequence.getNextNumber(),
                sequence.getEndNumber(),
                sequence.getExpiresAt(),
                sequence.isActive(),
                sequence.getPrefix() + String.format("%08d", sequence.getNextNumber()),
                Math.max(sequence.getEndNumber() - sequence.getNextNumber() + 1, 0)
        );
    }
}
