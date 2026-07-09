package rd.dalventa.api.rental.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.rental.domain.RentalContractItem;

import java.util.List;
import java.util.UUID;

public interface RentalContractItemRepository extends JpaRepository<RentalContractItem, UUID> {
    List<RentalContractItem> findAllByRentalContractId(UUID rentalContractId);
}
