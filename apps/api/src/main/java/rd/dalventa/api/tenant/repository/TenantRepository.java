package rd.dalventa.api.tenant.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.domain.TenantStatus;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {

    boolean existsBySlug(String slug);

    Optional<Tenant> findBySlug(String slug);

    long countByStatus(TenantStatus status);

    Page<Tenant> findAll(Pageable pageable);

    Page<Tenant> findByStatus(TenantStatus status, Pageable pageable);

    List<Tenant> findByTrialEndsAtBetweenOrderByTrialEndsAtAsc(Instant from, Instant to);

    List<Tenant> findTop5ByOrderByCreatedAtDesc();

    @org.springframework.data.jpa.repository.Query("""
            SELECT t FROM Tenant t
            WHERE t.status = 'ACTIVE'
            AND (:q IS NULL OR :q = ''
                OR LOWER(t.name) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(t.slug) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(t.city) LIKE LOWER(CONCAT('%', :q, '%')))
            ORDER BY t.name
            """)
    List<Tenant> searchPublic(@org.springframework.data.repository.query.Param("q") String q,
                              org.springframework.data.domain.Pageable pageable);
}
