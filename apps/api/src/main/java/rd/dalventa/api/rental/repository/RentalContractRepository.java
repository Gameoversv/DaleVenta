package rd.dalventa.api.rental.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.rental.domain.RentalContract;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RentalContractRepository extends JpaRepository<RentalContract, UUID> {
    List<RentalContract> findAllByTenantIdOrderByCreatedAtDesc(UUID tenantId);
    Optional<RentalContract> findByTenantIdAndSaleId(UUID tenantId, UUID saleId);

    @Query(value = "select coalesce(max(cast(substring(contract_number from 4) as bigint)), 0) from rental_contracts where tenant_id = :tenantId", nativeQuery = true)
    long maxContractSequence(@Param("tenantId") UUID tenantId);
}
