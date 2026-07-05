package rd.dalventa.api.cash.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.cash.domain.CashTransaction;
import rd.dalventa.api.cash.domain.TransactionType;
import rd.dalventa.api.cash.dto.CashBalanceResponse;
import rd.dalventa.api.cash.dto.CashTransactionResponse;
import rd.dalventa.api.cash.dto.CreateCashTransactionRequest;
import rd.dalventa.api.cash.repository.CashRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ApiResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CashService {

    private final CashRepository cashRepository;

    @Transactional(readOnly = true)
    public ApiResponse<List<CashTransactionResponse>> list(LocalDate from, LocalDate to, int page, int size) {
        UUID tenantId = TenantContext.require();
        LocalDate dateFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate dateTo = to != null ? to : LocalDate.now();

        var result = cashRepository.findByTenantIdAndTransactionDateBetweenOrderByTransactionDateDescCreatedAtDesc(
                tenantId, dateFrom, dateTo, PageRequest.of(page, size));

        var data = result.getContent().stream().map(CashTransactionResponse::from).toList();
        return ApiResponse.paged(data, result.getTotalElements(), page, size);
    }

    @Transactional(readOnly = true)
    public ApiResponse<CashBalanceResponse> balance(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();
        LocalDate dateFrom = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate dateTo = to != null ? to : LocalDate.now();

        BigDecimal ingresos = cashRepository.sumByTenantIdAndTypeAndDateRange(tenantId, TransactionType.INGRESO, dateFrom, dateTo);
        BigDecimal egresos = cashRepository.sumByTenantIdAndTypeAndDateRange(tenantId, TransactionType.EGRESO, dateFrom, dateTo);

        return ApiResponse.ok(new CashBalanceResponse(
                dateFrom, dateTo, ingresos, egresos, ingresos.subtract(egresos)));
    }

    @Transactional
    public ApiResponse<CashTransactionResponse> create(CreateCashTransactionRequest req) {
        UUID tenantId = TenantContext.require();
        if (req.amount() == null || req.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor a cero");
        }
        if (req.description() == null || req.description().isBlank()) {
            throw new IllegalArgumentException("La descripción es requerida");
        }

        var tx = new CashTransaction();
        tx.setTenantId(tenantId);
        tx.setType(TransactionType.valueOf(req.type()));
        tx.setAmount(req.amount());
        tx.setDescription(req.description().trim());
        tx.setCategory(req.category());
        tx.setTransactionDate(req.transactionDate() != null ? req.transactionDate() : LocalDate.now());

        CashTransaction saved = cashRepository.saveAndFlush(tx);
        CashTransaction reloaded = cashRepository.findById(saved.getId()).orElse(saved);
        return ApiResponse.ok(CashTransactionResponse.from(reloaded));
    }
}
