package rd.dalventa.api.fiscal.dto;

import rd.dalventa.api.fiscal.domain.FiscalProfile;

public record FiscalProfileResponse(
        String businessName,
        String tradeName,
        String rnc,
        String fiscalAddress,
        String phone,
        String email,
        String taxRegime
) {
    public static FiscalProfileResponse from(FiscalProfile profile) {
        return new FiscalProfileResponse(
                profile.getBusinessName(),
                profile.getTradeName(),
                profile.getRnc(),
                profile.getFiscalAddress(),
                profile.getPhone(),
                profile.getEmail(),
                profile.getTaxRegime()
        );
    }
}
