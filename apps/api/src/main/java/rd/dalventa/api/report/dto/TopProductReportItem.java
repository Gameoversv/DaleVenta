package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;
import java.util.UUID;

public record TopProductReportItem(
        @JsonProperty("productId") UUID productId,
        @JsonProperty("productName") String productName,
        long quantity,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal revenue
) {}
