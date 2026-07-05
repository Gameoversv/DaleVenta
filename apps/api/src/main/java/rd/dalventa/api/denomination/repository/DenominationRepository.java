package rd.dalventa.api.denomination.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.denomination.domain.Denomination;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DenominationRepository extends JpaRepository<Denomination, UUID> {
    List<Denomination> findAllByTenantIdAndActiveTrue(UUID tenantId);
    Optional<Denomination> findByIdAndTenantId(UUID id, UUID tenantId);
}
