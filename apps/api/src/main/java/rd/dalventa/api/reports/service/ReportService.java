package rd.dalventa.api.reports.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.reports.dto.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ReportService {

    @PersistenceContext
    private EntityManager em;

    // ─── Sales ────────────────────────────────────────────────────────────────

    public SalesSummaryResponse salesReport(UUID tenantId, LocalDate from, LocalDate to, String groupBy) {
        BigDecimal total = paymentSum(tenantId, from, to);
        long invoiceCount = invoiceCount(tenantId, from, to);
        long completedOts = completedOtCount(tenantId, from, to);
        BigDecimal avg = invoiceCount > 0
                ? total.divide(BigDecimal.valueOf(invoiceCount), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long days = to.toEpochDay() - from.toEpochDay() + 1;
        LocalDate prevTo = from.minusDays(1);
        LocalDate prevFrom = prevTo.minusDays(days - 1);
        BigDecimal previousTotal = paymentSum(tenantId, prevFrom, prevTo);

        List<SalesTrendEntry> trend = buildTrend(tenantId, from, to, groupBy);

        return new SalesSummaryResponse(total, previousTotal, invoiceCount, avg, completedOts, trend);
    }

    private BigDecimal paymentSum(UUID tenantId, LocalDate from, LocalDate to) {
        BigDecimal result = (BigDecimal) em.createQuery("""
                SELECT COALESCE(SUM(p.amount), 0)
                FROM Payment p
                WHERE p.tenantId = :tid
                  AND p.paymentDate >= :from
                  AND p.paymentDate <= :to
                """)
                .setParameter("tid", tenantId)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
        return result == null ? BigDecimal.ZERO : result;
    }

    private long invoiceCount(UUID tenantId, LocalDate from, LocalDate to) {
        return (long) em.createQuery("""
                SELECT COUNT(i)
                FROM Invoice i
                WHERE i.tenantId = :tid
                  AND i.issueDate >= :from
                  AND i.issueDate <= :to
                  AND i.status = rd.dalventa.api.invoice.domain.InvoiceStatus.PAGADA
                """)
                .setParameter("tid", tenantId)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
    }

    private long completedOtCount(UUID tenantId, LocalDate from, LocalDate to) {
        return (long) em.createQuery("""
                SELECT COUNT(wo)
                FROM WorkOrder wo
                WHERE wo.tenantId = :tid
                  AND wo.status = rd.dalventa.api.workorder.domain.WorkOrderStatus.COMPLETADA
                  AND CAST(wo.completedAt AS localdate) >= :from
                  AND CAST(wo.completedAt AS localdate) <= :to
                """)
                .setParameter("tid", tenantId)
                .setParameter("from", from)
                .setParameter("to", to)
                .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    private List<SalesTrendEntry> buildTrend(UUID tenantId, LocalDate from, LocalDate to, String groupBy) {
        List<Object[]> rows = em.createQuery("""
                SELECT p.paymentDate, SUM(p.amount), COUNT(p)
                FROM Payment p
                WHERE p.tenantId = :tid
                  AND p.paymentDate >= :from
                  AND p.paymentDate <= :to
                GROUP BY p.paymentDate
                ORDER BY p.paymentDate
                """)
                .setParameter("tid", tenantId)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        if ("month".equals(groupBy)) {
            return aggregateByMonth(rows);
        } else if ("week".equals(groupBy)) {
            return aggregateByWeek(rows);
        }
        // day — return as is
        return rows.stream()
                .map(r -> new SalesTrendEntry(
                        ((LocalDate) r[0]).format(DateTimeFormatter.ISO_LOCAL_DATE),
                        (BigDecimal) r[1],
                        (long) r[2]))
                .toList();
    }

    private List<SalesTrendEntry> aggregateByMonth(List<Object[]> rows) {
        var map = new java.util.LinkedHashMap<String, SalesTrendAcc>();
        for (var r : rows) {
            String key = ((LocalDate) r[0]).format(DateTimeFormatter.ofPattern("yyyy-MM"));
            map.computeIfAbsent(key, k -> new SalesTrendAcc()).add((BigDecimal) r[1], (long) r[2]);
        }
        return map.entrySet().stream()
                .map(e -> new SalesTrendEntry(e.getKey(), e.getValue().revenue, e.getValue().count))
                .toList();
    }

    private List<SalesTrendEntry> aggregateByWeek(List<Object[]> rows) {
        var map = new java.util.LinkedHashMap<String, SalesTrendAcc>();
        for (var r : rows) {
            LocalDate d = (LocalDate) r[0];
            String key = d.getYear() + "-W" + String.format("%02d", d.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear()));
            map.computeIfAbsent(key, k -> new SalesTrendAcc()).add((BigDecimal) r[1], (long) r[2]);
        }
        return map.entrySet().stream()
                .map(e -> new SalesTrendEntry(e.getKey(), e.getValue().revenue, e.getValue().count))
                .toList();
    }

    private static class SalesTrendAcc {
        BigDecimal revenue = BigDecimal.ZERO;
        long count = 0;

        void add(BigDecimal rev, long c) {
            revenue = revenue.add(rev);
            count += c;
        }
    }

    // ─── Inventory ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public InventoryReportResponse inventoryReport(UUID tenantId) {
        Object[] totals = (Object[]) em.createQuery("""
                SELECT COALESCE(SUM(p.currentStock * p.salePrice), 0), COUNT(p), SUM(CASE WHEN p.currentStock <= p.minStock THEN 1 ELSE 0 END)
                FROM Product p
                WHERE p.tenantId = :tid AND p.active = true
                """)
                .setParameter("tid", tenantId)
                .getSingleResult();

        BigDecimal inventoryValue = (BigDecimal) totals[0];
        long totalProducts = (long) totals[1];
        long lowStockCount = (long) totals[2];

        List<Object[]> topParts = em.createQuery("""
                SELECT wi.description, COUNT(wi), SUM(wi.total)
                FROM WorkOrderItem wi
                JOIN wi.workOrder wo
                WHERE wo.tenantId = :tid AND wi.type = rd.dalventa.api.workorder.domain.WorkOrderItemType.PARTS
                GROUP BY wi.description
                ORDER BY COUNT(wi) DESC
                """)
                .setParameter("tid", tenantId)
                .setMaxResults(10)
                .getResultList();

        List<TopProductEntry> topProducts = topParts.stream()
                .map(r -> new TopProductEntry((String) r[0], (long) r[1], (BigDecimal) r[2]))
                .toList();

        List<Object[]> lowStockRows = em.createQuery("""
                SELECT p.internalCode, p.description, p.currentStock, p.minStock
                FROM Product p
                WHERE p.tenantId = :tid AND p.active = true AND p.currentStock <= p.minStock
                ORDER BY p.currentStock ASC
                """)
                .setParameter("tid", tenantId)
                .getResultList();

        List<LowStockEntry> lowStockItems = lowStockRows.stream()
                .map(r -> new LowStockEntry((String) r[0], (String) r[1], (int) r[2], (int) r[3]))
                .toList();

        return new InventoryReportResponse(inventoryValue, totalProducts, lowStockCount, topProducts, lowStockItems);
    }

    // ─── Mechanics ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public MechanicsReportResponse mechanicsReport(UUID tenantId, LocalDate from, LocalDate to) {
        List<Object[]> rows = em.createQuery("""
                SELECT wo.assignedTo,
                       SUM(CASE WHEN wo.status = rd.dalventa.api.workorder.domain.WorkOrderStatus.COMPLETADA THEN 1 ELSE 0 END),
                       SUM(CASE WHEN wo.status = rd.dalventa.api.workorder.domain.WorkOrderStatus.CANCELADA THEN 1 ELSE 0 END),
                       COALESCE(SUM(CASE WHEN wo.status = rd.dalventa.api.workorder.domain.WorkOrderStatus.COMPLETADA THEN wo.actualCost ELSE 0 END), 0),
                       AVG(CASE WHEN wo.status = rd.dalventa.api.workorder.domain.WorkOrderStatus.COMPLETADA AND wo.startedAt IS NOT NULL AND wo.completedAt IS NOT NULL
                           THEN (EXTRACT(EPOCH FROM wo.completedAt) - EXTRACT(EPOCH FROM wo.startedAt)) / 3600.0
                           ELSE NULL END)
                FROM WorkOrder wo
                WHERE wo.tenantId = :tid
                  AND wo.assignedTo IS NOT NULL
                  AND CAST(wo.createdAt AS localdate) >= :from
                  AND CAST(wo.createdAt AS localdate) <= :to
                GROUP BY wo.assignedTo
                ORDER BY SUM(CASE WHEN wo.status = rd.dalventa.api.workorder.domain.WorkOrderStatus.COMPLETADA THEN 1 ELSE 0 END) DESC
                """)
                .setParameter("tid", tenantId)
                .setParameter("from", from)
                .setParameter("to", to)
                .getResultList();

        List<MechanicProductivityEntry> mechanics = rows.stream()
                .map(r -> new MechanicProductivityEntry(
                        (String) r[0],
                        ((Number) r[1]).longValue(),
                        ((Number) r[2]).longValue(),
                        (BigDecimal) r[3],
                        r[4] != null ? ((Number) r[4]).doubleValue() : null))
                .toList();

        return new MechanicsReportResponse(mechanics);
    }
}
