package rd.dalventa.api.workorder.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.workorder.domain.WorkOrderItem;

import java.util.UUID;

public interface WorkOrderItemRepository extends JpaRepository<WorkOrderItem, UUID> {}
