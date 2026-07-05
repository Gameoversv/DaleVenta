package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.dto.CashShiftDenominationEntry;
import rd.dalventa.api.cashshift.dto.CashShiftSummaryResponse;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashShiftService {

    private final CashShiftRepository cashShiftRepository;
    private final CashShiftDenominationRepository cashShiftDenominationRepository;
    private final RegisterRepository registerRepository;
    private final DenominationRepository denominationRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public CashShiftSummaryResponse open(OpenCashShiftRequest req) {
        var tenantId = TenantContext.require();
        registerRepository.findByIdAndTenantId(req.registerId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));

        if (cashShiftRepository.findByRegisterIdAndStatus(req.registerId(), CashShiftStatus.OPEN).isPresent()) {
            throw new DuplicateResourceException("Esta caja ya tiene un turno abierto");
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();

        BigDecimal openingTotal = BigDecimal.ZERO;
        for (DenominationCountEntry entry : req.openingCounts()) {
            var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
            openingTotal = openingTotal.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
        }

        var shift = new CashShift(req.registerId(), userId, openingTotal);
        shift.setTenantId(tenantId);
        try {
            shift = cashShiftRepository.save(shift);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Esta caja ya tiene un turno abierto");
        }

        for (DenominationCountEntry entry : req.openingCounts()) {
            var csd = new CashShiftDenomination(shift.getId(), entry.denominationId(), entry.quantity());
            csd.setTenantId(tenantId);
            cashShiftDenominationRepository.save(csd);
        }

        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public CashShiftSummaryResponse getSummary(UUID id) {
        var shift = requireShiftInTenant(id);
        return buildSummary(shift);
    }

    CashShift requireShiftInTenant(UUID id) {
        var tenantId = TenantContext.require();
        return cashShiftRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
    }

    private CashShiftSummaryResponse buildSummary(CashShift shift) {
        List<CashShiftDenominationEntry> denominations = cashShiftDenominationRepository
                .findAllByCashShiftId(shift.getId())
                .stream().map(CashShiftDenominationEntry::from).toList();
        return CashShiftSummaryResponse.from(shift, denominations);
    }
}
