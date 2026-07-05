package rd.dalventa.api.credit.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.credit.domain.CreditAccount;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;
import rd.dalventa.api.credit.dto.CreditAccountResponse;
import rd.dalventa.api.credit.dto.CreditProfileResponse;
import rd.dalventa.api.credit.dto.UpdateCreditProfileRequest;
import rd.dalventa.api.credit.repository.CreditAccountRepository;
import rd.dalventa.api.credit.repository.CustomerCreditProfileRepository;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.RoundingMode;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final CustomerCreditProfileRepository customerCreditProfileRepository;
    private final CreditAccountRepository creditAccountRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public CreditProfileResponse updateProfile(UUID customerId, UpdateCreditProfileRequest req) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var profile = customerCreditProfileRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var p = new CustomerCreditProfile(customerId);
                    p.setTenantId(tenantId);
                    return p;
                });
        profile.setCreditEnabled(req.creditEnabled());
        profile.setCreditLimit(req.creditLimit().setScale(2, RoundingMode.HALF_UP));
        return CreditProfileResponse.from(customerCreditProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public CreditAccountResponse getAccount(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = creditAccountRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var a = new CreditAccount(customerId);
                    a.setTenantId(tenantId);
                    return a;
                });
        return CreditAccountResponse.from(account);
    }

    CreditAccount getOrCreateAccount(UUID tenantId, UUID customerId) {
        return creditAccountRepository.lockByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var a = new CreditAccount(customerId);
                    a.setTenantId(tenantId);
                    return creditAccountRepository.save(a);
                });
    }
}
