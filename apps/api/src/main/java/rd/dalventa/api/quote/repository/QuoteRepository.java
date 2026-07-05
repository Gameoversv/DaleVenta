package rd.dalventa.api.quote.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.quote.domain.Quote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuoteRepository extends JpaRepository<Quote, UUID> {

    @Query("SELECT q FROM Quote q LEFT JOIN FETCH q.items WHERE q.tenantId = :tenantId AND q.workOrder.id = :workOrderId ORDER BY q.createdAt DESC")
    List<Quote> findByWorkOrderId(@Param("tenantId") UUID tenantId, @Param("workOrderId") UUID workOrderId);

    @Query("SELECT q FROM Quote q LEFT JOIN FETCH q.items WHERE q.id = :id AND q.tenantId = :tenantId")
    Optional<Quote> findByIdWithItems(@Param("id") UUID id, @Param("tenantId") UUID tenantId);
}
