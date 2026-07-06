package rd.dalventa.api.dashboard.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cashshift.domain.CashShiftStatus;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.credit.repository.CreditAccountRepository;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.dashboard.dto.DashboardSummaryResponse;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.sale.domain.SaleStatus;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.shared.domain.TenantContext;

import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;
    private final CashShiftRepository cashShiftRepository;
    private final BranchInventoryRepository branchInventoryRepository;
    private final CreditAccountRepository creditAccountRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        var tenantId = TenantContext.require();
        var startOfDay = ZonedDateTime.now(ZoneId.systemDefault())
                .toLocalDate()
                .atStartOfDay(ZoneId.systemDefault())
                .toInstant();

        return new DashboardSummaryResponse(
                saleRepository.countByTenantIdAndStatusAndCreatedAtGreaterThanEqual(
                        tenantId, SaleStatus.COMPLETED, startOfDay),
                saleRepository.sumTotalSince(tenantId, SaleStatus.COMPLETED, startOfDay),
                cashShiftRepository.countByTenantIdAndStatus(tenantId, CashShiftStatus.OPEN),
                branchInventoryRepository.countLowStock(tenantId),
                customerRepository.countByTenantIdAndActiveTrue(tenantId),
                creditAccountRepository.sumPositiveBalance(tenantId)
        );
    }
}
