package rd.dalventa.api.fiscal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.fiscal.domain.FiscalProfile;

import java.util.Optional;
import java.util.UUID;

public interface FiscalProfileRepository extends JpaRepository<FiscalProfile, UUID> {
    Optional<FiscalProfile> findByTenantId(UUID tenantId);
}
