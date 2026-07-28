package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySalesReportItem(
        LocalDate date,
        @JsonProperty("salesCount") long salesCount,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal revenue
) {}
