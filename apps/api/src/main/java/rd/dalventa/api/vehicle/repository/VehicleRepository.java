package rd.dalventa.api.vehicle.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.vehicle.domain.Vehicle;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    Optional<Vehicle> findByIdAndTenantIdAndActiveTrue(UUID id, UUID tenantId);

    List<Vehicle> findByCustomerIdAndTenantIdAndActiveTrue(UUID customerId, UUID tenantId);

    boolean existsByVinAndTenantIdAndActiveTrue(String vin, UUID tenantId);

    boolean existsByLicensePlateAndTenantIdAndActiveTrue(String licensePlate, UUID tenantId);

    long countByTenantIdAndActiveTrue(UUID tenantId);

    @Query(value = """
            SELECT v FROM Vehicle v JOIN FETCH v.customer c
            WHERE v.tenantId = :tenantId
            AND v.active = true
            AND (:customerId IS NULL OR c.id = :customerId)
            AND (:q IS NULL OR :q = ''
                OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(v.vin)          LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.firstName)    LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.lastName)     LIKE LOWER(CONCAT('%', :q, '%')))
            """,
            countQuery = """
            SELECT COUNT(v) FROM Vehicle v JOIN v.customer c
            WHERE v.tenantId = :tenantId
            AND v.active = true
            AND (:customerId IS NULL OR c.id = :customerId)
            AND (:q IS NULL OR :q = ''
                OR LOWER(v.licensePlate) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(v.vin)          LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.firstName)    LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.lastName)     LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    Page<Vehicle> search(@Param("tenantId") UUID tenantId,
                         @Param("customerId") UUID customerId,
                         @Param("q") String q,
                         Pageable pageable);
}
