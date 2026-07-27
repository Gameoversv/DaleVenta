package rd.dalventa.api.report.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import rd.dalventa.api.product.domain.Product;
import rd.dalventa.api.product.repository.ProductRepository;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Pure aggregation logic of the sales report, exercised without a database so every rounding and
 * filtering rule is pinned down individually.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SalesReportServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final LocalDate DAY = LocalDate.of(2026, 3, 10);

    @Mock private SaleRepository saleRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private SaleItemRepository saleItemRepository;
    @Mock private ProductRepository productRepository;

    private SalesReportService service;

    @BeforeEach
    void setUp() {
        service = new SalesReportService(saleRepository, paymentRepository, saleItemRepository, productRepository);
        TenantContext.set(TENANT_ID);
        when(paymentRepository.findAllByTenantIdAndSaleIdIn(any(), anyList())).thenReturn(List.of());
        when(saleItemRepository.findAllByTenantIdAndSaleIdIn(any(), anyList())).thenReturn(List.of());
        when(productRepository.findAllById(any())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("voided sales are counted but excluded from revenue and the average ticket")
    void sales_excludeVoidedFromMoneyTotals() {
        givenSales(
                sale(SaleStatus.COMPLETED, "300.00", "0.00", "0.00", DAY),
                sale(SaleStatus.COMPLETED, "200.00", "0.00", "0.00", DAY),
                sale(SaleStatus.VOIDED, "999.00", "0.00", "0.00", DAY)
        );

        var report = service.sales(DAY, DAY);

        assertThat(report.totalSales()).isEqualTo(3);
        assertThat(report.completedSales()).isEqualTo(2);
        assertThat(report.voidedSales()).isEqualTo(1);
        assertThat(report.grossRevenue()).isEqualByComparingTo("500.00");
        assertThat(report.averageTicket()).isEqualByComparingTo("250.00");
    }

    @Test
    @DisplayName("the average ticket rounds half up to two decimals")
    void averageTicket_roundsHalfUp() {
        givenSales(
                sale(SaleStatus.COMPLETED, "100.00", "0.00", "0.00", DAY),
                sale(SaleStatus.COMPLETED, "100.00", "0.00", "0.00", DAY),
                sale(SaleStatus.COMPLETED, "100.01", "0.00", "0.00", DAY)
        );

        // 300.01 / 3 = 100.00333... -> 100.00
        assertThat(service.sales(DAY, DAY).averageTicket()).isEqualByComparingTo("100.00");
    }

    @Test
    @DisplayName("an empty period reports zeroes instead of dividing by zero")
    void emptyPeriod_reportsZeroes() {
        givenSales();

        var report = service.sales(DAY, DAY);

        assertThat(report.completedSales()).isZero();
        assertThat(report.grossRevenue()).isEqualByComparingTo("0");
        assertThat(report.averageTicket()).isEqualByComparingTo("0");
        assertThat(report.payments()).isEmpty();
        assertThat(report.topProducts()).isEmpty();
    }

    @Test
    @DisplayName("discount and tax totals accumulate across completed sales only")
    void discountAndTax_accumulateOverCompletedSales() {
        givenSales(
                sale(SaleStatus.COMPLETED, "118.00", "18.00", "10.00", DAY),
                sale(SaleStatus.COMPLETED, "236.00", "36.00", "5.00", DAY),
                sale(SaleStatus.VOIDED, "500.00", "76.27", "50.00", DAY)
        );

        var report = service.sales(DAY, DAY);

        assertThat(report.taxTotal()).isEqualByComparingTo("54.00");
        assertThat(report.discountTotal()).isEqualByComparingTo("15.00");
    }

    @Test
    @DisplayName("the daily series has one entry per day, including days without sales")
    void dailySeries_coversEveryDayInRange() {
        var from = DAY;
        var to = DAY.plusDays(3);
        givenSales(sale(SaleStatus.COMPLETED, "150.00", "0.00", "0.00", DAY.plusDays(2)));

        var daily = service.sales(from, to).dailySales();

        assertThat(daily).hasSize(4);
        assertThat(daily.get(0).date()).isEqualTo(from);
        assertThat(daily.get(0).salesCount()).isZero();
        assertThat(daily.get(0).revenue()).isEqualByComparingTo("0");
        assertThat(daily.get(2).salesCount()).isEqualTo(1);
        assertThat(daily.get(2).revenue()).isEqualByComparingTo("150.00");
        assertThat(daily.get(3).date()).isEqualTo(to);
    }

    @Test
    @DisplayName("payments are grouped by method and sorted by amount, biggest first")
    void paymentBreakdown_groupsAndSortsByAmount() {
        var completed = sale(SaleStatus.COMPLETED, "500.00", "0.00", "0.00", DAY);
        givenSales(completed);
        when(paymentRepository.findAllByTenantIdAndSaleIdIn(eq(TENANT_ID), anyList())).thenReturn(List.of(
                new Payment(completed.getId(), PaymentMethod.CASH, new BigDecimal("100.00")),
                new Payment(completed.getId(), PaymentMethod.TRANSFER, new BigDecimal("250.00")),
                new Payment(completed.getId(), PaymentMethod.TRANSFER, new BigDecimal("150.00"))
        ));

        var payments = service.sales(DAY, DAY).payments();

        assertThat(payments).hasSize(2);
        assertThat(payments.get(0).method()).isEqualTo(PaymentMethod.TRANSFER);
        assertThat(payments.get(0).paymentsCount()).isEqualTo(2);
        assertThat(payments.get(0).amount()).isEqualByComparingTo("400.00");
        assertThat(payments.get(1).method()).isEqualTo(PaymentMethod.CASH);
    }

    @Test
    @DisplayName("top products accumulate quantity and revenue per product and rank by revenue")
    void topProducts_rankByRevenue() {
        var completed = sale(SaleStatus.COMPLETED, "900.00", "0.00", "0.00", DAY);
        givenSales(completed);
        var cheap = UUID.randomUUID();
        var pricey = UUID.randomUUID();
        when(saleItemRepository.findAllByTenantIdAndSaleIdIn(eq(TENANT_ID), anyList())).thenReturn(List.of(
                new SaleItem(completed.getId(), cheap, 3, new BigDecimal("50.00"), BigDecimal.ZERO, new BigDecimal("150.00")),
                new SaleItem(completed.getId(), cheap, 2, new BigDecimal("50.00"), BigDecimal.ZERO, new BigDecimal("100.00")),
                new SaleItem(completed.getId(), pricey, 1, new BigDecimal("650.00"), BigDecimal.ZERO, new BigDecimal("650.00"))
        ));
        when(productRepository.findAllById(any())).thenReturn(List.of(
                product(cheap, "Pan de agua"),
                product(pricey, "Bizcocho de boda")
        ));

        var top = service.sales(DAY, DAY).topProducts();

        assertThat(top).hasSize(2);
        assertThat(top.get(0).productName()).isEqualTo("Bizcocho de boda");
        assertThat(top.get(0).revenue()).isEqualByComparingTo("650.00");
        assertThat(top.get(1).productName()).isEqualTo("Pan de agua");
        assertThat(top.get(1).quantity()).isEqualTo(5);
        assertThat(top.get(1).revenue()).isEqualByComparingTo("250.00");
    }

    @Test
    @DisplayName("a product deleted after the sale still shows up, with a placeholder name")
    void topProducts_keepDeletedProductsVisible() {
        var completed = sale(SaleStatus.COMPLETED, "80.00", "0.00", "0.00", DAY);
        givenSales(completed);
        when(saleItemRepository.findAllByTenantIdAndSaleIdIn(eq(TENANT_ID), anyList())).thenReturn(List.of(
                new SaleItem(completed.getId(), UUID.randomUUID(), 2, new BigDecimal("40.00"),
                        BigDecimal.ZERO, new BigDecimal("80.00"))
        ));
        when(productRepository.findAllById(any())).thenReturn(List.of());

        assertThat(service.sales(DAY, DAY).topProducts())
                .singleElement()
                .satisfies(item -> assertThat(item.productName()).isEqualTo("Producto eliminado"));
    }

    @Test
    @DisplayName("an inverted date range is rejected before any query runs")
    void invertedRange_isRejected() {
        assertThatThrownBy(() -> service.sales(DAY, DAY.minusDays(1)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("fecha final");
    }

    private void givenSales(Sale... sales) {
        when(saleRepository.findAllByTenantIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(
                eq(TENANT_ID), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(sales));
    }

    private Sale sale(SaleStatus status, String total, String tax, String discount, LocalDate day) {
        var sale = new Sale(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), null, UUID.randomUUID());
        sale.setTenantId(TENANT_ID);
        sale.setStatus(status);
        sale.setTotal(new BigDecimal(total));
        sale.setTaxTotal(new BigDecimal(tax));
        sale.setDiscountAmount(new BigDecimal(discount));
        // createdAt is populated by JPA auditing, which never runs in a plain unit test.
        ReflectionTestUtils.setField(sale, "createdAt",
                day.atTime(12, 0).atZone(ZoneId.systemDefault()).toInstant(), Instant.class);
        return sale;
    }

    private Product product(UUID id, String description) {
        var product = new Product();
        product.setTenantId(TENANT_ID);
        product.setDescription(description);
        ReflectionTestUtils.setField(product, "id", id, UUID.class);
        return product;
    }
}
