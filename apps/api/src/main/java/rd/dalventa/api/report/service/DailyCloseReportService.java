package rd.dalventa.api.report.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashShift;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.report.dto.DailyCloseReportResponse;
import rd.dalventa.api.sale.domain.Payment;
import rd.dalventa.api.sale.domain.PaymentMethod;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleStatus;
import rd.dalventa.api.sale.repository.PaymentRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.shared.domain.TenantContext;
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
