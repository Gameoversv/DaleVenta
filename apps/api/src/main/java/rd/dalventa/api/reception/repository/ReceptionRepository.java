package rd.dalventa.api.reception.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.reception.domain.Reception;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReceptionRepository extends JpaRepository<Reception, UUID> {

    @Query("SELECT r FROM Reception r JOIN FETCH r.vehicle v JOIN FETCH v.customer WHERE r.id = :id AND r.tenantId = :tenantId AND r.active = true")
    Optional<Reception> findByIdWithVehicle(@Param("id") UUID id, @Param("tenantId") UUID tenantId);

    @Query("SELECT r FROM Reception r JOIN FETCH r.vehicle v WHERE r.tenantId = :tenantId AND v.id = :vehicleId AND r.active = true ORDER BY r.createdAt DESC")
    List<Reception> findByVehicleId(@Param("tenantId") UUID tenantId, @Param("vehicleId") UUID vehicleId);

    @Query(value = "SELECT r FROM Reception r JOIN FETCH r.vehicle v JOIN FETCH v.customer WHERE r.tenantId = :tenantId AND r.active = true",
           countQuery = "SELECT COUNT(r) FROM Reception r WHERE r.tenantId = :tenantId AND r.active = true")
    Page<Reception> findAllActive(@Param("tenantId") UUID tenantId, Pageable pageable);
}
