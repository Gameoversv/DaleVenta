package rd.dalventa.api.report.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;
import java.util.UUID;

public record TopProductReportItem(
        UUID productId,
        String productName,
        long quantity,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal revenue
) {}
