package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import rd.dalventa.api.report.domain.DailyClosing;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DailyClosingResponse(
        UUID id,
        String closeNumber,
        LocalDate closeDate,
        UUID registerId,
        String registerName,
        String closedByName,
        Instant closedAt,
        long completedSales,
        long voidedSales,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal grossRevenue,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashExpected,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashCounted,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference
) {
    public static DailyClosingResponse from(DailyClosing closing, String registerName, String closedByName) {
        return new DailyClosingResponse(
                closing.getId(),
                closing.getCloseNumber(),
                closing.getCloseDate(),
                closing.getRegisterId(),
                registerName,
                closedByName,
                closing.getClosedAt(),
                closing.getCompletedSales(),
                closing.getVoidedSales(),
                closing.getGrossRevenue(),
                closing.getTaxTotal(),
                closing.getDiscountTotal(),
                closing.getCashExpected(),
                closing.getCashCounted(),
                closing.getCashDifference()
        );
    }
}
