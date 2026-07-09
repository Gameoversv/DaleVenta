package rd.dalventa.api.rental.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.rental.domain.RentalContract;
import rd.dalventa.api.rental.domain.RentalContractStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RentalContractResponse(
        UUID id,
        @JsonProperty("contractNumber") String contractNumber,
        @JsonProperty("saleId") UUID saleId,
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("customerName") String customerName,
        RentalContractStatus status,
        @JsonProperty("expectedReturnAt") Instant expectedReturnAt,
        @JsonProperty("returnedAt") Instant returnedAt,
        @JsonProperty("depositAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal depositAmount,
        String notes,
        @JsonProperty("createdAt") Instant createdAt,
        List<RentalContractItemResponse> items
) {
    public static RentalContractResponse from(RentalContract contract, String customerName, List<RentalContractItemResponse> items) {
        return new RentalContractResponse(
                contract.getId(), contract.getContractNumber(), contract.getSaleId(), contract.getCustomerId(),
                customerName, contract.getStatus(), contract.getExpectedReturnAt(), contract.getReturnedAt(),
                contract.getDepositAmount(), contract.getNotes(), contract.getCreatedAt(), items
        );
    }
}
