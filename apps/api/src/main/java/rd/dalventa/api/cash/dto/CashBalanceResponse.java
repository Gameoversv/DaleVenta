package rd.dalventa.api.cash.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CashBalanceResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalIngresos,
        BigDecimal totalEgresos,
        BigDecimal balance
) {}
