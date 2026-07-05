package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionRequest;
import rd.dalventa.api.cashshift.dto.ChangeSuggestionResponse;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.denomination.domain.Denomination;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashShiftChangeService {

    private final CashShiftRepository cashShiftRepository;
    private final CashShiftDenominationRepository cashShiftDenominationRepository;
    private final DenominationRepository denominationRepository;

    @Transactional(readOnly = true)
    public ChangeSuggestionResponse suggest(ChangeSuggestionRequest req) {
        var tenantId = TenantContext.require();
        var shift = cashShiftRepository.findByRegisterIdAndStatus(req.registerId(), CashShiftStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("No hay turno abierto en esa caja"));

        Map<UUID, Denomination> denominationsById = denominationRepository
                .findAllByTenantIdAndActiveTrue(tenantId).stream()
                .collect(java.util.stream.Collectors.toMap(Denomination::getId, d -> d));

        Map<UUID, Integer> receivedByDenomination = new HashMap<>();
        if (req.receivedDenominations() != null) {
            for (DenominationCountEntry entry : req.receivedDenominations()) {
                receivedByDenomination.merge(entry.denominationId(), entry.quantity(), Integer::sum);
            }
        }

        List<ChangeSuggestionCalculator.AvailableDenomination> available = new ArrayList<>();
        for (var csd : cashShiftDenominationRepository.findAllByCashShiftId(shift.getId())) {
            var denomination = denominationsById.get(csd.getDenominationId());
            if (denomination == null) {
                continue;
            }
            long valueCents = denomination.getValue().multiply(BigDecimal.valueOf(100)).longValueExact();
            int quantity = csd.getCurrentQuantity() + receivedByDenomination.getOrDefault(csd.getDenominationId(), 0);
            available.add(new ChangeSuggestionCalculator.AvailableDenomination(csd.getDenominationId(), valueCents, quantity));
        }

        var result = ChangeSuggestionCalculator.suggest(req.changeAmountCents(), available);
        List<DenominationCountEntry> combination = result.combination().entrySet().stream()
                .map(e -> new DenominationCountEntry(e.getKey(), e.getValue()))
                .toList();
        return new ChangeSuggestionResponse(result.exact(), combination);
    }
}
