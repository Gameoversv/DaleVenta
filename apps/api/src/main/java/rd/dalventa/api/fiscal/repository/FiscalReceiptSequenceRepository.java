package rd.dalventa.api.fiscal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import rd.dalventa.api.fiscal.domain.FiscalReceiptSequence;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FiscalReceiptSequenceRepository extends JpaRepository<FiscalReceiptSequence, UUID> {
    List<FiscalReceiptSequence> findAllByTenantIdOrderByReceiptTypeAscCreatedAtDesc(UUID tenantId);
    Optional<FiscalReceiptSequence> findByIdAndTenantId(UUID id, UUID tenantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<FiscalReceiptSequence> findByTenantIdAndReceiptTypeAndActiveTrue(UUID tenantId, FiscalReceiptType receiptType);
}
