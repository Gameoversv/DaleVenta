package rd.dalventa.api.dashboard.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.dashboard.dto.DashboardSummaryResponse;
import rd.dalventa.api.shared.domain.TenantContext;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse summary() {
        var tenantId = TenantContext.require();
        return new DashboardSummaryResponse(customerRepository.countByTenantIdAndActiveTrue(tenantId));
    }
}
