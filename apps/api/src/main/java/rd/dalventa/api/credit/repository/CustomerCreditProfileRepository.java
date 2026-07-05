package rd.dalventa.api.credit.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;

import java.util.Optional;
import java.util.UUID;

public interface CustomerCreditProfileRepository extends JpaRepository<CustomerCreditProfile, UUID> {
    Optional<CustomerCreditProfile> findByCustomerIdAndTenantId(UUID customerId, UUID tenantId);
}
