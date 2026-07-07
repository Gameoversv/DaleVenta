package rd.dalventa.api.fiscal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.fiscal.domain.FiscalReceiptSequence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FiscalReceiptSequenceRepository extends JpaRepository<FiscalReceiptSequence, UUID> {
    List<FiscalReceiptSequence> findAllByTenantIdOrderByReceiptTypeAscCreatedAtDesc(UUID tenantId);
    Optional<FiscalReceiptSequence> findByIdAndTenantId(UUID id, UUID tenantId);
}
