package rd.dalventa.api.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.auth.domain.UserRegisterAssignment;

import java.util.List;
import java.util.UUID;

public interface UserRegisterAssignmentRepository extends JpaRepository<UserRegisterAssignment, UUID> {
    List<UserRegisterAssignment> findAllByUserId(UUID userId);

    boolean existsByUserIdAndRegisterId(UUID userId, UUID registerId);

    @Modifying
    @Query("delete from UserRegisterAssignment assignment where assignment.userId = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
