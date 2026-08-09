package rd.dalventa.api.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.auth.domain.UserBranchAssignment;

import java.util.List;
import java.util.UUID;

public interface UserBranchAssignmentRepository extends JpaRepository<UserBranchAssignment, UUID> {
    List<UserBranchAssignment> findAllByUserId(UUID userId);

    boolean existsByUserIdAndBranchId(UUID userId, UUID branchId);

    @Modifying
    @Query("delete from UserBranchAssignment assignment where assignment.userId = :userId")
    void deleteAllByUserId(@Param("userId") UUID userId);
}
