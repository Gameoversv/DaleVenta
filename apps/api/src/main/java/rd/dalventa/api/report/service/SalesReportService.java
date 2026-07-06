package rd.dalventa.api.report.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.report.dto.DailySalesReportItem;
import rd.dalventa.api.report.dto.PaymentMethodReportItem;
import rd.dalventa.api.report.dto.SalesReportResponse;
import rd.dalventa.api.report.dto.TopProductReportItem;
import rd.dalventa.api.sale.domain.Payment;
import rd.dalventa.api.sale.domain.PaymentMethod;
import rd.dalventa.api.sale.domain.Sale;
import rd.dalventa.api.sale.domain.SaleItem;
import rd.dalventa.api.sale.domain.SaleStatus;
import rd.dalventa.api.sale.repository.PaymentRepository;
import rd.dalventa.api.sale.repository.SaleItemRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SalesReportService {

    private final SaleRepository saleRepository;
    private final PaymentRepository paymentRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public SalesReportResponse sales(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) {
            throw new IllegalArgumentException("La fecha final no puede ser menor que la inicial");
        }

        var tenantId = TenantContext.require();
        var zone = ZoneId.systemDefault();
        var start = from.atStartOfDay(zone).toInstant();
        var end = to.plusDays(1).atStartOfDay(zone).toInstant();
        var sales = saleRepository.findAllByTenantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                tenantId, start, end);

        var completedSales = sales.stream().filter(s -> s.getStatus() == SaleStatus.COMPLETED).toList();
        var completedSaleIds = completedSales.stream().map(Sale::getId).toList();
        var grossRevenue = completedSales.stream().map(Sale::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        var discountTotal = completedSales.stream().map(Sale::getDiscountAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        var taxTotal = completedSales.stream().map(Sale::getTaxTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
        var averageTicket = completedSales.isEmpty()
                ? BigDecimal.ZERO
                : grossRevenue.divide(BigDecimal.valueOf(completedSales.size()), 2, RoundingMode.HALF_UP);

        return new SalesReportResponse(
                from,
                to,
                sales.size(),
                completedSales.size(),
                sales.stream().filter(s -> s.getStatus() == SaleStatus.VOIDED).count(),
                grossRevenue,
                discountTotal,
                taxTotal,
                averageTicket,
                paymentBreakdown(tenantId, completedSaleIds),
                topProducts(tenantId, completedSaleIds),
                dailySales(completedSales, from, to, zone)
        );
    }

    private List<PaymentMethodReportItem> paymentBreakdown(UUID tenantId, List<UUID> saleIds) {
        if (saleIds.isEmpty()) {
            return List.of();
        }

        Map<PaymentMethod, List<Payment>> byMethod = paymentRepository.findAllByTenantIdAndSaleIdIn(tenantId, saleIds)
                .stream()
                .collect(Collectors.groupingBy(Payment::getMethod, () -> new EnumMap<>(PaymentMethod.class), Collectors.toList()));

        return byMethod.entrySet().stream()
                .map(entry -> new PaymentMethodReportItem(
                        entry.getKey(),
                        entry.getValue().size(),
                        entry.getValue().stream().map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add)
                ))
                .sorted(Comparator.comparing(PaymentMethodReportItem::amount).reversed())
                .toList();
    }

    private List<TopProductReportItem> topProducts(UUID tenantId, List<UUID> saleIds) {
        if (saleIds.isEmpty()) {
            return List.of();
        }

        var items = saleItemRepository.findAllByTenantIdAndSaleIdIn(tenantId, saleIds);
        var productIds = items.stream().map(SaleItem::getProductId).distinct().toList();
        var productsById = productRepository.findAllById(productIds)
                .stream()
                .filter(product -> tenantId.equals(product.getTenantId()))
                .collect(Collectors.toMap(Product::getId, Product::getDescription));

        Map<UUID, ProductAccumulator> totals = new HashMap<>();
        for (SaleItem item : items) {
            var accumulator = totals.computeIfAbsent(item.getProductId(), id -> new ProductAccumulator());
            accumulator.quantity += item.getQuantity();
            accumulator.revenue = accumulator.revenue.add(item.getLineTotal());
        }

        return totals.entrySet().stream()
                .map(entry -> new TopProductReportItem(
                        entry.getKey(),
                        productsById.getOrDefault(entry.getKey(), "Producto eliminado"),
                        entry.getValue().quantity,
                        entry.getValue().revenue
                ))
                .sorted(Comparator.comparing(TopProductReportItem::revenue).reversed())
                .limit(10)
                .toList();
    }

    private List<DailySalesReportItem> dailySales(List<Sale> sales, LocalDate from, LocalDate to, ZoneId zone) {
        Map<LocalDate, List<Sale>> byDate = sales.stream()
                .collect(Collectors.groupingBy(sale -> LocalDate.ofInstant(sale.getCreatedAt(), zone)));

        var result = new ArrayList<DailySalesReportItem>();
        for (var date = from; !date.isAfter(to); date = date.plusDays(1)) {
            var daySales = byDate.getOrDefault(date, List.of());
            var revenue = daySales.stream().map(Sale::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            result.add(new DailySalesReportItem(date, daySales.size(), revenue));
        }
        return result;
    }

    private static class ProductAccumulator {
        private long quantity;
        private BigDecimal revenue = BigDecimal.ZERO;
    }
}
