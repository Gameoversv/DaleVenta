package rd.dalventa.api.quotation.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import rd.dalventa.api.quotation.domain.QuotationItem;

import java.util.List;
import java.util.UUID;

public interface QuotationItemRepository extends JpaRepository<QuotationItem, UUID> {
    List<QuotationItem> findAllByQuotationId(UUID quotationId);
}
