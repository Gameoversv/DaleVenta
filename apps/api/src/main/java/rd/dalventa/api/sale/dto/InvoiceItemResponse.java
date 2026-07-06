package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.math.BigDecimal;

public record InvoiceItemResponse(
        String productName,
        int quantity,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitPrice,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineTotal
) {}
