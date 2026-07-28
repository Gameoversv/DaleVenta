package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.report.domain.DailyClosing;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record DailyClosingResponse(
        UUID id,
        @JsonProperty("closeNumber") String closeNumber,
        @JsonProperty("closeDate") LocalDate closeDate,
        @JsonProperty("registerId") UUID registerId,
        @JsonProperty("registerName") String registerName,
        @JsonProperty("closedByName") String closedByName,
        @JsonProperty("closedAt") Instant closedAt,
        @JsonProperty("completedSales") long completedSales,
        @JsonProperty("voidedSales") long voidedSales,
        @JsonProperty("grossRevenue") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal grossRevenue,
        @JsonProperty("taxTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxTotal,
        @JsonProperty("discountTotal") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal discountTotal,
        @JsonProperty("cashExpected") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashExpected,
        @JsonProperty("cashCounted") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashCounted,
        @JsonProperty("cashDifference") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal cashDifference
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
