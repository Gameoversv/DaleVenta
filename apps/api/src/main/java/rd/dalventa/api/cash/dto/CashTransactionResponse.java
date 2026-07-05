package rd.dalventa.api.cash.dto;

import rd.dalventa.api.cash.domain.CashTransaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CashTransactionResponse(
        UUID id,
        String type,
        BigDecimal amount,
        String description,
        String category,
        LocalDate transactionDate,
        String createdAt
) {
    public static CashTransactionResponse from(CashTransaction t) {
        return new CashTransactionResponse(
                t.getId(),
                t.getType().name(),
                t.getAmount(),
                t.getDescription(),
                t.getCategory(),
                t.getTransactionDate(),
                t.getCreatedAt() != null ? t.getCreatedAt().toString() : null
        );
    }
}
