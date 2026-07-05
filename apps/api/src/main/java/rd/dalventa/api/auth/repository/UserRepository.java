package rd.dalventa.api.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.auth.domain.User;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    long countByTenantId(java.util.UUID tenantId);
    long countByTenantIdIsNotNull();
    java.util.List<User> findByTenantId(java.util.UUID tenantId);
    org.springframework.data.domain.Page<User> findByEmailContainingIgnoreCaseAndTenantIdIsNotNull(
        String email, org.springframework.data.domain.Pageable pageable);

    java.util.Optional<User> findByCustomerIdAndTenantId(java.util.UUID customerId, java.util.UUID tenantId);

    boolean existsByCustomerId(java.util.UUID customerId);
}
