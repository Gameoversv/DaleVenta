package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.domain.ShiftInventoryCount;
import rd.dalventa.api.cashshift.dto.CashShiftDenominationEntry;
import rd.dalventa.api.cashshift.dto.CashShiftSummaryResponse;
import rd.dalventa.api.cashshift.dto.CloseCashShiftRequest;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.dto.InventoryCountEntry;
import rd.dalventa.api.cashshift.dto.OpenCashShiftRequest;
import rd.dalventa.api.cashshift.dto.ShiftInventoryCountEntry;
import rd.dalventa.api.cashshift.repository.CashMovementRepository;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.cashshift.repository.ShiftInventoryCountRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.repository.TenantRepository;

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
    private final CashMovementRepository cashMovementRepository;
    private final ShiftInventoryCountRepository shiftInventoryCountRepository;
    private final BranchInventoryRepository branchInventoryRepository;
    private final AuditLogService auditLogService;
    private final TenantRepository tenantRepository;

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

        boolean denominationsEnabled = cashDenominationsEnabled(tenantId);
        BigDecimal openingTotal = denominationsEnabled
                ? totalFromDenominations(req.openingCounts(), tenantId)
                : requireNonNegativeAmount(req.openingAmount(), "Debe indicar el fondo inicial");

        var shift = new CashShift(req.registerId(), userId, openingTotal);
        shift.setTenantId(tenantId);
        try {
            shift = cashShiftRepository.save(shift);
        } catch (DataIntegrityViolationException e) {
            throw new DuplicateResourceException("Esta caja ya tiene un turno abierto");
        }

        if (denominationsEnabled) {
            if (req.openingCounts().isEmpty()) {
                throw new IllegalArgumentException("Debe indicar el conteo inicial por denominacion");
            }
            for (DenominationCountEntry entry : req.openingCounts()) {
                var csd = new CashShiftDenomination(shift.getId(), entry.denominationId(), entry.quantity());
                csd.setTenantId(tenantId);
                cashShiftDenominationRepository.save(csd);
            }
        }

        for (InventoryCountEntry entry : req.inventoryCounts()) {
            var sic = new ShiftInventoryCount(shift.getId(), entry.productId(), entry.quantity());
            sic.setTenantId(tenantId);
            shiftInventoryCountRepository.save(sic);
        }

        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public CashShiftSummaryResponse getSummary(UUID id) {
        var shift = requireShiftInTenant(id);
        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public CashShiftSummaryResponse getCurrentOpenShift(UUID registerId) {
        var tenantId = TenantContext.require();
        registerRepository.findByIdAndTenantId(registerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));
        var shift = cashShiftRepository.findByRegisterIdAndStatus(registerId, CashShiftStatus.OPEN)
                .orElseThrow(() -> new ResourceNotFoundException("No hay turno abierto para esta caja"));
        return buildSummary(shift);
    }

    @Transactional
    public CashShiftSummaryResponse close(UUID id, CloseCashShiftRequest req) {
        var shift = requireShiftInTenant(id);
        var tenantId = TenantContext.require();
        if (shift.getStatus() != CashShiftStatus.OPEN) {
            throw new DuplicateResourceException("Este turno ya esta cerrado");
        }

        boolean denominationsEnabled = cashDenominationsEnabled(tenantId);
        BigDecimal countedCash;
        if (denominationsEnabled) {
            if (req.closingCounts().isEmpty()) {
                throw new IllegalArgumentException("Debe indicar el conteo final por denominacion");
            }
            countedCash = BigDecimal.ZERO;
            for (DenominationCountEntry entry : req.closingCounts()) {
                var csd = cashShiftDenominationRepository
                        .findByCashShiftIdAndDenominationId(id, entry.denominationId())
                        .orElseThrow(() -> new ResourceNotFoundException("Denominacion no registrada en este turno"));
                csd.setClosingQuantity(entry.quantity());
                cashShiftDenominationRepository.save(csd);

                var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
                countedCash = countedCash.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
            }
        } else {
            countedCash = requireNonNegativeAmount(req.countedCash(), "Debe indicar el efectivo contado");
        }

        BigDecimal expectedCash = computeExpectedCash(shift, tenantId);

        BigDecimal difference = countedCash.subtract(expectedCash);

        var register = registerRepository.findByIdAndTenantId(shift.getRegisterId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));

        boolean hasInventoryDiscrepancy = false;
        for (InventoryCountEntry entry : req.inventoryCounts()) {
            var sic = shiftInventoryCountRepository.findByCashShiftIdAndProductId(id, entry.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Producto no contado en la apertura de este turno"));
            int expectedQuantity = branchInventoryRepository
                    .findByTenantIdAndBranchIdAndProductId(tenantId, register.getBranchId(), entry.productId())
                    .map(bi -> bi.getCurrentStock())
                    .orElse(0);
            sic.setClosingQuantity(entry.quantity());
            sic.setExpectedQuantity(expectedQuantity);
            shiftInventoryCountRepository.save(sic);
            if (entry.quantity() != expectedQuantity) {
                hasInventoryDiscrepancy = true;
            }
        }

        if ((difference.compareTo(BigDecimal.ZERO) != 0 || hasInventoryDiscrepancy)
                && (req.closingNotes() == null || req.closingNotes().isBlank())) {
            throw new IllegalArgumentException("Se requiere una nota explicando la diferencia de caja o inventario");
        }

        shift.setExpectedCash(expectedCash);
        shift.setCountedCash(countedCash);
        shift.setCashDifference(difference);
        shift.setClosingNotes(req.closingNotes());
        shift.setStatus(CashShiftStatus.CLOSED);
        shift.setClosedAt(java.time.Instant.now());
        cashShiftRepository.save(shift);
        auditLogService.recordEvent(AuditAction.CASH_SHIFT_CLOSE, "CASH_SHIFT", shift.getId(),
                currentUserProvider.current().orElseThrow(() -> new IllegalStateException("Usuario no autenticado")).getId(),
                "Turno cerrado. Diferencia: " + difference);

        return buildSummary(shift);
    }

    @Transactional(readOnly = true)
    public List<CashShiftSummaryResponse> list(UUID registerId) {
        var tenantId = TenantContext.require();
        return cashShiftRepository.findAllByTenantIdAndRegisterId(tenantId, registerId)
                .stream().map(this::buildSummary).toList();
    }

    CashShift requireShiftInTenant(UUID id) {
        var tenantId = TenantContext.require();
        return cashShiftRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
    }

    private BigDecimal computeExpectedCash(CashShift shift, UUID tenantId) {
        BigDecimal expected = shift.getOpeningTotal();
        for (var movement : cashMovementRepository.findAllByTenantIdAndCashShiftId(tenantId, shift.getId())) {
            expected = switch (movement.getType()) {
                case ENTRY -> expected.add(movement.getAmount());
                case WITHDRAWAL, EXPENSE -> expected.subtract(movement.getAmount());
            };
        }
        return expected;
    }

    private boolean cashDenominationsEnabled(UUID tenantId) {
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"))
                .isCashDenominationsEnabled();
    }

    private BigDecimal totalFromDenominations(List<DenominationCountEntry> entries, UUID tenantId) {
        BigDecimal total = BigDecimal.ZERO;
        for (DenominationCountEntry entry : entries) {
            var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
            total = total.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
        }
        return total;
    }

    private BigDecimal requireNonNegativeAmount(BigDecimal amount, String message) {
        if (amount == null || amount.signum() < 0) {
            throw new IllegalArgumentException(message);
        }
        return amount.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    private CashShiftSummaryResponse buildSummary(CashShift shift) {
        List<CashShiftDenominationEntry> denominations = cashShiftDenominationRepository
                .findAllByCashShiftId(shift.getId())
                .stream().map(CashShiftDenominationEntry::from).toList();
        BigDecimal expectedCash = shift.getStatus() == CashShiftStatus.OPEN
                ? computeExpectedCash(shift, TenantContext.require())
                : shift.getExpectedCash();
        List<ShiftInventoryCountEntry> inventoryCounts = shiftInventoryCountRepository
                .findAllByCashShiftId(shift.getId())
                .stream().map(ShiftInventoryCountEntry::from).toList();
        return CashShiftSummaryResponse.from(shift, expectedCash, denominations, inventoryCounts);
    }
}
