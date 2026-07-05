package rd.dalventa.api.cash.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import rd.dalventa.api.cash.domain.CashTransaction;
import rd.dalventa.api.cash.domain.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface CashRepository extends JpaRepository<CashTransaction, UUID> {

    Page<CashTransaction> findByTenantIdAndTransactionDateBetweenOrderByTransactionDateDescCreatedAtDesc(
            UUID tenantId, LocalDate from, LocalDate to, Pageable pageable);

    @Query("""
            SELECT COALESCE(SUM(t.amount), 0) FROM CashTransaction t
            WHERE t.tenantId = :tenantId
            AND t.type = :type
            AND t.transactionDate BETWEEN :from AND :to
            """)
    BigDecimal sumByTenantIdAndTypeAndDateRange(
            @Param("tenantId") UUID tenantId,
            @Param("type") TransactionType type,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
