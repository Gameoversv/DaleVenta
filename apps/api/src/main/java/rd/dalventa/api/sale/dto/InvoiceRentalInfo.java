package rd.dalventa.api.sale.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.rental.domain.RentalContract;
import rd.dalventa.api.rental.domain.RentalContractStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record InvoiceRentalInfo(
        @JsonProperty("contractNumber") String contractNumber,
        RentalContractStatus status,
        @JsonProperty("expectedReturnAt") Instant expectedReturnAt,
        @JsonProperty("returnedAt") Instant returnedAt,
        @JsonProperty("depositAmount") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal depositAmount,
        String notes
) {
    public static InvoiceRentalInfo from(RentalContract contract) {
        return new InvoiceRentalInfo(
                contract.getContractNumber(),
                contract.getStatus(),
                contract.getExpectedReturnAt(),
                contract.getReturnedAt(),
                contract.getDepositAmount(),
                contract.getNotes()
        );
    }
}
