package rd.dalventa.api.customer.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.customer.domain.Customer;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository extends JpaRepository<Customer, UUID> {

    @Query("""
            SELECT c FROM Customer c
            WHERE c.tenantId = :tenantId
            AND c.active = true
            AND (:q IS NULL OR :q = ''
                OR LOWER(c.firstName) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(c.lastName) LIKE LOWER(CONCAT('%', :q, '%'))
                OR c.documentId LIKE CONCAT('%', :q, '%'))
            """)
    Page<Customer> search(@Param("tenantId") UUID tenantId,
                          @Param("q") String q,
                          Pageable pageable);

    Optional<Customer> findByIdAndTenantIdAndActiveTrue(UUID id, UUID tenantId);

    boolean existsByDocumentIdAndTenantIdAndActiveTrue(String documentId, UUID tenantId);

    Optional<Customer> findByDocumentIdAndTenantIdAndActiveTrue(String documentId, UUID tenantId);

    long countByTenantIdAndActiveTrue(UUID tenantId);
}
