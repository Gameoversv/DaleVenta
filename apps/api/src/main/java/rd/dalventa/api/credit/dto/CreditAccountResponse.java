package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.credit.domain.CreditAccount;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditAccountResponse(
        @JsonProperty("customerId") UUID customerId,
        @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal balance
) {
    public static CreditAccountResponse from(CreditAccount account) {
        return new CreditAccountResponse(account.getCustomerId(), account.getBalance());
    }
}
