package rd.dalventa.api.credit.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditProfileResponse(
        @JsonProperty("customerId") UUID customerId,
        @JsonProperty("creditEnabled") boolean creditEnabled,
        @JsonProperty("creditLimit") @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal creditLimit
) {
    public static CreditProfileResponse from(CustomerCreditProfile profile) {
        return new CreditProfileResponse(profile.getCustomerId(), profile.isCreditEnabled(), profile.getCreditLimit());
    }
}
