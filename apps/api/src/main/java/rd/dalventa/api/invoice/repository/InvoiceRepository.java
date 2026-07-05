package rd.dalventa.api.invoice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.invoice.domain.Invoice;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    @Query("SELECT i FROM Invoice i JOIN FETCH i.workOrder wo JOIN FETCH wo.reception r JOIN FETCH r.vehicle v JOIN FETCH v.customer WHERE i.tenantId = :tenantId ORDER BY i.issueDate DESC")
    Page<Invoice> findAllWithDetails(@Param("tenantId") UUID tenantId, Pageable pageable);

    @Query("SELECT i FROM Invoice i JOIN FETCH i.workOrder wo JOIN FETCH wo.reception r JOIN FETCH r.vehicle v JOIN FETCH v.customer LEFT JOIN FETCH i.items WHERE i.id = :id AND i.tenantId = :tenantId")
    Optional<Invoice> findByIdWithDetails(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    @Query("SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoiceNumber, 10) AS int)), 0) FROM Invoice i WHERE i.tenantId = :tenantId AND i.invoiceNumber LIKE CONCAT('FAC-', :year, '-%')")
    int findMaxSeqForYear(@Param("tenantId") UUID tenantId, @Param("year") int year);

    @Query("SELECT i FROM Invoice i JOIN i.workOrder wo JOIN wo.reception r JOIN r.vehicle v WHERE i.tenantId = :tenantId AND v.id = :vehicleId ORDER BY i.issueDate DESC")
    List<Invoice> findByVehicleId(@Param("tenantId") UUID tenantId, @Param("vehicleId") UUID vehicleId);
}
