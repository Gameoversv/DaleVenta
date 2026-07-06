package rd.dalventa.api.report.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.report.domain.DailyClosing;
import rd.dalventa.api.report.dto.DailyClosingResponse;
import rd.dalventa.api.report.dto.DailyCloseReportResponse;
import rd.dalventa.api.report.repository.DailyClosingRepository;
import rd.dalventa.api.sale.domain.Payment;
import rd.dalventa.api.sale.domain.PaymentMethod;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleStatus;
import rd.dalventa.api.sale.repository.PaymentRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.DuplicateResourceException;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyCloseReportService {

    private final SaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final CashShiftRepository cashShiftRepository;
    private final RegisterRepository registerRepository;
    private final DailyClosingRepository dailyClosingRepository;
    private final CurrentUserProvider currentUserProvider;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public DailyCloseReportResponse report(LocalDate date, UUID registerId) {
        var tenantId = TenantContext.require();
        var zone = ZoneId.systemDefault();
        var start = date.atStartOfDay(zone).toInstant();
        var end = date.plusDays(1).atStartOfDay(zone).toInstant();
        var register = registerId != null
                ? registerRepository.findByIdAndTenantId(registerId, tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"))
                : null;

        var sales = registerId != null
                ? saleRepository.findAllByTenantIdAndRegisterIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                    tenantId, registerId, start, end)
                : saleRepository.findAllByTenantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                    tenantId, start, end);
        var completed = sales.stream().filter(sale -> sale.getStatus() == SaleStatus.COMPLETED).toList();
        var saleIds = completed.stream().map(Sale::getId).toList();
        var shifts = registerId != null
                ? cashShiftRepository.findAllByTenantIdAndRegisterIdAndOpenedAtGreaterThanEqualAndOpenedAtLessThan(
                    tenantId, registerId, start, end)
                : cashShiftRepository.findAllByTenantIdAndOpenedAtGreaterThanEqualAndOpenedAtLessThan(tenantId, start, end);

        return new DailyCloseReportResponse(
                date,
                register != null ? register.getName() : "Todas las cajas",
                completed.size(),
                sales.stream().filter(sale -> sale.getStatus() == SaleStatus.VOIDED).count(),
                completed.stream().map(Sale::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                completed.stream().map(Sale::getTaxTotal).reduce(BigDecimal.ZERO, BigDecimal::add),
                completed.stream().map(Sale::getDiscountAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                shifts.stream().map(shift -> valueOrZero(shift.getExpectedCash())).reduce(BigDecimal.ZERO, BigDecimal::add),
                shifts.stream().map(shift -> valueOrZero(shift.getCountedCash())).reduce(BigDecimal.ZERO, BigDecimal::add),
                shifts.stream().map(shift -> valueOrZero(shift.getCashDifference())).reduce(BigDecimal.ZERO, BigDecimal::add),
                paymentBreakdown(tenantId, saleIds),
                shifts.stream()
                        .sorted(Comparator.comparing(CashShift::getOpenedAt))
                        .map(shift -> new DailyCloseReportResponse.ShiftRow(
                                shift.getId().toString(),
                                shift.getStatus().name(),
                                shift.getOpenedAt() != null ? shift.getOpenedAt().toString() : null,
                                shift.getClosedAt() != null ? shift.getClosedAt().toString() : null,
                                valueOrZero(shift.getExpectedCash()),
                                valueOrZero(shift.getCountedCash()),
                                valueOrZero(shift.getCashDifference())
                        ))
                        .toList()
        );
    }

    @Transactional
    public DailyClosingResponse close(LocalDate date, UUID registerId) {
        if (registerId == null) {
            throw new IllegalArgumentException("Selecciona una caja para guardar el cierre diario");
        }
        var tenantId = TenantContext.require();
        var register = registerRepository.findByIdAndTenantId(registerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Caja no encontrada"));
        if (dailyClosingRepository.existsByTenantIdAndCloseDateAndRegisterId(tenantId, date, registerId)) {
            throw new DuplicateResourceException("Esta caja ya tiene cierre guardado para esa fecha");
        }

        var report = report(date, registerId);
        var user = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"));
        long sequence = dailyClosingRepository.maxCloseSequence(tenantId) + 1;

        var closing = new DailyClosing();
        closing.setTenantId(tenantId);
        closing.setCloseSequence(sequence);
        closing.setCloseNumber("CD-%06d".formatted(sequence));
        closing.setCloseDate(date);
        closing.setRegisterId(registerId);
        closing.setClosedBy(user.getId());
        closing.setClosedAt(java.time.Instant.now());
        closing.setCompletedSales(report.completedSales());
        closing.setVoidedSales(report.voidedSales());
        closing.setGrossRevenue(report.grossRevenue());
        closing.setTaxTotal(report.taxTotal());
        closing.setDiscountTotal(report.discountTotal());
        closing.setCashExpected(report.cashExpected());
        closing.setCashCounted(report.cashCounted());
        closing.setCashDifference(report.cashDifference());
        closing = dailyClosingRepository.save(closing);

        auditLogService.record(AuditAction.DAILY_CLOSE_CREATE, "DAILY_CLOSING", closing.getId(), user.getId(),
                "Cierre " + closing.getCloseNumber() + " para " + date + " / " + register.getName());
        return toResponse(closing);
    }

    @Transactional(readOnly = true)
    public List<DailyClosingResponse> closings() {
        return dailyClosingRepository.findAllByTenantIdOrderByCloseDateDescClosedAtDesc(TenantContext.require())
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public boolean isClosed(UUID tenantId, LocalDate date, UUID registerId) {
        return dailyClosingRepository.existsByTenantIdAndCloseDateAndRegisterId(tenantId, date, registerId);
    }

    private DailyClosingResponse toResponse(DailyClosing closing) {
        var registerName = registerRepository.findById(closing.getRegisterId()).map(r -> r.getName()).orElse("-");
        var userName = userRepository.findById(closing.getClosedBy())
                .map(user -> user.getName() + " (" + user.getEmail() + ")")
                .orElse(closing.getClosedBy().toString());
        return DailyClosingResponse.from(closing, registerName, userName);
    }

    private List<DailyCloseReportResponse.PaymentBreakdown> paymentBreakdown(UUID tenantId, List<UUID> saleIds) {
        if (saleIds.isEmpty()) {
            return List.of();
        }
        Map<PaymentMethod, List<Payment>> byMethod = paymentRepository.findAllByTenantIdAndSaleIdIn(tenantId, saleIds)
                .stream()
                .collect(Collectors.groupingBy(Payment::getMethod, () -> new EnumMap<>(PaymentMethod.class), Collectors.toList()));
        return byMethod.entrySet().stream()
                .map(entry -> new DailyCloseReportResponse.PaymentBreakdown(
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparing(DailyCloseReportResponse.PaymentBreakdown::amount).reversed())
                .toList();
    }

    private static BigDecimal valueOrZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
