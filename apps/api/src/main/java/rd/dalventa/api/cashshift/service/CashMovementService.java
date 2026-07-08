package rd.dalventa.api.cashshift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashMovement;
import rd.dalventa.api.cashshift.domain.CashMovementDenomination;
import rd.dalventa.api.cashshift.domain.CashMovementType;
import rd.dalventa.api.cashshift.domain.CashShiftDenomination;
import rd.dalventa.api.cashshift.dto.CashMovementResponse;
import rd.dalventa.api.cashshift.dto.CreateCashMovementRequest;
import rd.dalventa.api.cashshift.dto.DenominationCountEntry;
import rd.dalventa.api.cashshift.repository.CashMovementDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashMovementRepository;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CashMovementService {

    private final CashShiftService cashShiftService;
    private final CashShiftDenominationRepository cashShiftDenominationRepository;
    private final DenominationRepository denominationRepository;
    private final CashMovementRepository cashMovementRepository;
    private final CashMovementDenominationRepository cashMovementDenominationRepository;
    private final CurrentUserProvider currentUserProvider;
    private final TenantRepository tenantRepository;

    @Transactional
    public CashMovementResponse recordMovement(UUID cashShiftId, CreateCashMovementRequest req) {
        return recordMovement(cashShiftId, req, null);
    }

    @Transactional(readOnly = true)
    public List<CashMovementResponse> list(UUID cashShiftId) {
        cashShiftService.requireShiftInTenant(cashShiftId);
        var tenantId = TenantContext.require();
        var movements = cashMovementRepository.findAllByTenantIdAndCashShiftIdOrderByCreatedAtDesc(tenantId, cashShiftId);
        if (movements.isEmpty()) {
            return List.of();
        }

        var movementIds = movements.stream().map(CashMovement::getId).toList();
        var denominationsByMovement = cashMovementDenominationRepository
                .findAllByTenantIdAndCashMovementIdIn(tenantId, movementIds)
                .stream()
                .collect(Collectors.groupingBy(
                        CashMovementDenomination::getCashMovementId,
                        Collectors.mapping(
                                d -> new DenominationCountEntry(d.getDenominationId(), d.getQuantity()),
                                Collectors.toList()
                        )
                ));

        return movements.stream()
                .map(m -> CashMovementResponse.from(m, denominationsByMovement.getOrDefault(m.getId(), List.of())))
                .toList();
    }

    @Transactional
    public CashMovementResponse recordMovement(UUID cashShiftId, CreateCashMovementRequest req, UUID saleId) {
        cashShiftService.requireShiftInTenant(cashShiftId);
        var tenantId = TenantContext.require();
        boolean denominationsEnabled = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"))
                .isCashDenominationsEnabled();
        boolean isOutflow = req.type() != CashMovementType.ENTRY;

        Map<UUID, CashShiftDenomination> locked = new HashMap<>();
        BigDecimal amount = BigDecimal.ZERO;

        if (denominationsEnabled) {
            if (req.denominations().isEmpty()) {
                throw new IllegalArgumentException("Debe indicar denominaciones para el movimiento");
            }
            for (DenominationCountEntry entry : req.denominations()) {
                var csd = cashShiftDenominationRepository
                        .lockByCashShiftIdAndDenominationId(cashShiftId, entry.denominationId())
                        .orElseGet(() -> createCashShiftDenomination(tenantId, cashShiftId, entry.denominationId()));

                int newQuantity = isOutflow
                        ? csd.getCurrentQuantity() - entry.quantity()
                        : csd.getCurrentQuantity() + entry.quantity();
                if (newQuantity < 0) {
                    throw new IllegalArgumentException("Existencia insuficiente de esa denominacion en la caja");
                }
                locked.put(entry.denominationId(), csd);

                var denomination = denominationRepository.findByIdAndTenantId(entry.denominationId(), tenantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Denominacion no encontrada"));
                amount = amount.add(denomination.getValue().multiply(BigDecimal.valueOf(entry.quantity())));
            }
        } else {
            if (req.amount() == null || req.amount().signum() <= 0) {
                throw new IllegalArgumentException("Debe indicar un monto mayor que cero");
            }
            amount = req.amount().setScale(2, java.math.RoundingMode.HALF_UP);
        }

        var userId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        var movement = new CashMovement(cashShiftId, req.type(), amount, req.reason(), userId);
        movement.setTenantId(tenantId);
        movement.setSaleId(saleId);
        movement = cashMovementRepository.save(movement);

        if (denominationsEnabled) {
            for (DenominationCountEntry entry : req.denominations()) {
                var csd = locked.get(entry.denominationId());
                int updated = isOutflow ? csd.getCurrentQuantity() - entry.quantity() : csd.getCurrentQuantity() + entry.quantity();
                csd.setCurrentQuantity(updated);
                cashShiftDenominationRepository.save(csd);

                var cmd = new CashMovementDenomination(movement.getId(), entry.denominationId(), entry.quantity());
                cmd.setTenantId(tenantId);
                cashMovementDenominationRepository.save(cmd);
            }
        }

        return CashMovementResponse.from(movement);
    }

    private CashShiftDenomination createCashShiftDenomination(UUID tenantId, UUID cashShiftId, UUID denominationId) {
        var csd = new CashShiftDenomination(cashShiftId, denominationId, 0);
        csd.setTenantId(tenantId);
        return cashShiftDenominationRepository.save(csd);
    }
}
