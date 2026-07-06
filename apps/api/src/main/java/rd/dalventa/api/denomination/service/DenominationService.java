package rd.dalventa.api.denomination.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.denomination.domain.Denomination;
import rd.dalventa.api.denomination.domain.DenominationType;
import rd.dalventa.api.denomination.dto.CreateDenominationRequest;
import rd.dalventa.api.denomination.dto.DenominationResponse;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DenominationService {

    private final DenominationRepository denominationRepository;

    private static final BigDecimal[] DEFAULT_BILLS = {
            BigDecimal.valueOf(2000), BigDecimal.valueOf(1000), BigDecimal.valueOf(500),
            BigDecimal.valueOf(200), BigDecimal.valueOf(100), BigDecimal.valueOf(50)
    };
    private static final BigDecimal[] DEFAULT_COINS = {
            BigDecimal.valueOf(25), BigDecimal.valueOf(10), BigDecimal.valueOf(5), BigDecimal.valueOf(1)
    };

    @Transactional
    public void seedDefaults(UUID tenantId) {
        for (BigDecimal value : DEFAULT_BILLS) {
            var d = new Denomination(value, DenominationType.BILL);
            d.setTenantId(tenantId);
            denominationRepository.save(d);
        }
        for (BigDecimal value : DEFAULT_COINS) {
            var d = new Denomination(value, DenominationType.COIN);
            d.setTenantId(tenantId);
            denominationRepository.save(d);
        }
    }

    @Transactional
    public void seedDefaultsIfMissing(UUID tenantId) {
        if (!denominationRepository.existsByTenantId(tenantId)) {
            seedDefaults(tenantId);
        }
    }

    @Transactional
    public DenominationResponse create(CreateDenominationRequest req) {
        var d = new Denomination(req.value(), req.type());
        d.setTenantId(TenantContext.require());
        return DenominationResponse.from(denominationRepository.save(d));
    }

    @Transactional(readOnly = true)
    public List<DenominationResponse> list() {
        return denominationRepository.findAllByTenantIdAndActiveTrue(TenantContext.require())
                .stream().map(DenominationResponse::from).toList();
    }
}
