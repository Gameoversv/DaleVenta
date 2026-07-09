package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreateSaleRequest(
        @JsonProperty("registerId") @NotNull UUID registerId,
        @JsonProperty("cashShiftId") @NotNull UUID cashShiftId,
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("fiscalReceiptType") FiscalReceiptType fiscalReceiptType,
        @JsonProperty("discountAmount") BigDecimal discountAmount,
        @JsonProperty("rentalDetails") RentalDetailsRequest rentalDetails,
        @NotNull @Valid List<SaleItemRequest> items,
        @NotNull @Valid List<PaymentRequest> payments
) {}
