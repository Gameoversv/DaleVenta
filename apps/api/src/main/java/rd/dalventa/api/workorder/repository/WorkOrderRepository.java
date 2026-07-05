package rd.dalventa.api.workorder.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.workorder.domain.WorkOrder;
import rd.dalventa.api.workorder.domain.WorkOrderStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkOrderRepository extends JpaRepository<WorkOrder, UUID> {

    @Query("""
            SELECT wo FROM WorkOrder wo
            JOIN FETCH wo.reception r
            JOIN FETCH r.vehicle v
            JOIN FETCH v.customer
            LEFT JOIN FETCH wo.items
            WHERE wo.id = :id AND wo.tenantId = :tenantId
            """)
    Optional<WorkOrder> findByIdWithDetails(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    @Query("""
            SELECT wo FROM WorkOrder wo
            JOIN FETCH wo.reception r
            JOIN FETCH r.vehicle v
            JOIN FETCH v.customer
            WHERE r.id = :receptionId AND wo.tenantId = :tenantId
            """)
    Optional<WorkOrder> findByReceptionId(@Param("receptionId") UUID receptionId, @Param("tenantId") UUID tenantId);

    @Query("""
            SELECT wo FROM WorkOrder wo
            JOIN FETCH wo.reception r
            JOIN FETCH r.vehicle v
            LEFT JOIN FETCH wo.items
            WHERE wo.tenantId = :tenantId AND v.id = :vehicleId
            ORDER BY wo.createdAt DESC
            """)
    List<WorkOrder> findByVehicleIdWithItems(@Param("tenantId") UUID tenantId, @Param("vehicleId") UUID vehicleId);

    boolean existsByReceptionIdAndTenantId(UUID receptionId, UUID tenantId);

    long countByTenantId(UUID tenantId);

    long countByTenantIdAndStatusIn(UUID tenantId, List<WorkOrderStatus> statuses);

    long countByTenantIdAndStatusAndCompletedAtAfter(UUID tenantId, WorkOrderStatus status, Instant after);

    @Query("""
            SELECT wo FROM WorkOrder wo
            JOIN FETCH wo.reception r
            JOIN FETCH r.vehicle v
            JOIN FETCH v.customer
            WHERE wo.tenantId = :tenantId AND wo.status IN :statuses AND wo.createdAt < :before
            ORDER BY wo.createdAt ASC
            """)
    List<WorkOrder> findOverdue(@Param("tenantId") UUID tenantId,
                                @Param("statuses") List<WorkOrderStatus> statuses,
                                @Param("before") Instant before);

    @Query("""
            SELECT wo FROM WorkOrder wo
            JOIN FETCH wo.reception r
            JOIN FETCH r.vehicle v
            JOIN FETCH v.customer
            WHERE wo.tenantId = :tenantId AND (:status IS NULL OR wo.status = :status)
            """)
    Page<WorkOrder> findAllWithDetails(@Param("tenantId") UUID tenantId,
                                       @Param("status") WorkOrderStatus status,
                                       Pageable pageable);
}
