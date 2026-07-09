package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.math.BigDecimal;

public record InvoiceItemResponse(
        @JsonProperty("productName")
        String productName,
        @JsonProperty("productUnit")
        String productUnit,
        int quantity,
        @JsonProperty("unitPrice")
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal unitPrice,
        @JsonProperty("taxRate")
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal taxRate,
        @JsonProperty("lineTotal")
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal lineTotal
) {}
