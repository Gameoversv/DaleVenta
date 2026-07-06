package rd.dalventa.api.credit.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.credit.domain.CreditAccount;
import rd.dalventa.api.credit.domain.CreditTransaction;
import rd.dalventa.api.credit.domain.CreditTransactionType;
import rd.dalventa.api.credit.domain.CustomerCreditProfile;
import rd.dalventa.api.credit.dto.AccountsReceivableRow;
import rd.dalventa.api.credit.dto.CreditAccountResponse;
import rd.dalventa.api.credit.dto.CreditInvoiceRow;
import rd.dalventa.api.credit.dto.CreditProfileResponse;
import rd.dalventa.api.credit.dto.CreditTransactionResponse;
import rd.dalventa.api.credit.dto.RecordCreditPaymentRequest;
import rd.dalventa.api.credit.dto.UpdateCreditProfileRequest;
import rd.dalventa.api.credit.repository.CreditAccountRepository;
import rd.dalventa.api.credit.repository.CreditTransactionRepository;
import rd.dalventa.api.credit.repository.CustomerCreditProfileRepository;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final CustomerCreditProfileRepository customerCreditProfileRepository;
    private final CreditAccountRepository creditAccountRepository;
    private final CustomerRepository customerRepository;
    private final CreditTransactionRepository creditTransactionRepository;

    @Transactional
    public CreditProfileResponse updateProfile(UUID customerId, UpdateCreditProfileRequest req) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var profile = customerCreditProfileRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var p = new CustomerCreditProfile(customerId);
                    p.setTenantId(tenantId);
                    return p;
                });
        profile.setCreditEnabled(req.creditEnabled());
        profile.setCreditLimit(req.creditLimit().setScale(2, RoundingMode.HALF_UP));
        return CreditProfileResponse.from(customerCreditProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public CreditProfileResponse getProfile(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var profile = customerCreditProfileRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> new CustomerCreditProfile(customerId));
        return CreditProfileResponse.from(profile);
    }

    @Transactional(readOnly = true)
    public CreditAccountResponse getAccount(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = creditAccountRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var a = new CreditAccount(customerId);
                    a.setTenantId(tenantId);
                    return a;
                });
        return CreditAccountResponse.from(account);
    }

    CreditAccount getOrCreateAccount(UUID tenantId, UUID customerId) {
        return creditAccountRepository.lockByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    var a = new CreditAccount(customerId);
                    a.setTenantId(tenantId);
                    return creditAccountRepository.save(a);
                });
    }

    @Transactional
    public void charge(UUID tenantId, UUID customerId, BigDecimal amount, UUID saleId, UUID userId) {
        var profile = customerCreditProfileRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("El cliente no tiene credito habilitado"));
        if (!profile.isCreditEnabled()) {
            throw new IllegalArgumentException("El cliente no tiene credito habilitado");
        }

        var account = getOrCreateAccount(tenantId, customerId);
        var newBalance = account.getBalance().add(amount);
        if (newBalance.compareTo(profile.getCreditLimit()) > 0) {
            throw new IllegalArgumentException("La venta excede el limite de credito disponible");
        }

        account.setBalance(newBalance);
        creditAccountRepository.save(account);

        var transaction = new CreditTransaction(account.getId(), CreditTransactionType.CHARGE, amount, saleId, userId, null);
        transaction.setTenantId(tenantId);
        creditTransactionRepository.save(transaction);
    }

    @Transactional
    public void reverseCharge(UUID tenantId, UUID customerId, BigDecimal amount, UUID saleId, UUID userId) {
        var account = getOrCreateAccount(tenantId, customerId);
        account.setBalance(account.getBalance().subtract(amount));
        creditAccountRepository.save(account);

        var transaction = new CreditTransaction(account.getId(), CreditTransactionType.PAYMENT, amount, saleId, userId, "Anulacion venta");
        transaction.setTenantId(tenantId);
        creditTransactionRepository.save(transaction);
    }

    @Transactional
    public CreditAccountResponse recordPayment(UUID customerId, RecordCreditPaymentRequest req, UUID userId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = getOrCreateAccount(tenantId, customerId);

        UUID targetSaleId = null;
        if (req.saleId() != null) {
            var charge = creditTransactionRepository.findAllByTenantIdAndSaleId(tenantId, req.saleId()).stream()
                    .filter(t -> t.getType() == CreditTransactionType.CHARGE && t.getCreditAccountId().equals(account.getId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Factura no encontrada para este cliente"));
            var outstanding = invoiceOutstanding(tenantId, charge);
            if (req.amount().compareTo(outstanding) > 0) {
                throw new IllegalArgumentException("El abono no puede ser mayor al pendiente de esta factura");
            }
            targetSaleId = req.saleId();
        } else if (req.amount().compareTo(account.getBalance()) > 0) {
            throw new IllegalArgumentException("El abono no puede ser mayor al balance actual");
        }

        account.setBalance(account.getBalance().subtract(req.amount()));
        creditAccountRepository.save(account);

        var transaction = new CreditTransaction(account.getId(), CreditTransactionType.PAYMENT, req.amount(),
                targetSaleId, userId, req.note(), req.payerName());
        transaction.setTenantId(tenantId);
        creditTransactionRepository.save(transaction);

        return CreditAccountResponse.from(account);
    }

    @Transactional(readOnly = true)
    public java.util.List<CreditInvoiceRow> listOutstandingInvoices(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = creditAccountRepository.findByCustomerIdAndTenantId(customerId, tenantId).orElse(null);
        if (account == null) {
            return java.util.List.of();
        }

        return creditTransactionRepository.findAllByTenantIdAndCreditAccountId(tenantId, account.getId())
                .stream()
                .filter(t -> t.getType() == CreditTransactionType.CHARGE && t.getSaleId() != null)
                .map(charge -> {
                    var paid = invoicePaid(tenantId, charge);
                    var outstanding = charge.getAmount().subtract(paid);
                    return new CreditInvoiceRow(charge.getSaleId(), charge.getCreatedAt(), charge.getAmount(), paid, outstanding);
                })
                .filter(row -> row.outstanding().compareTo(BigDecimal.ZERO) > 0)
                .sorted(java.util.Comparator.comparing(CreditInvoiceRow::createdAt))
                .toList();
    }

    private BigDecimal invoicePaid(UUID tenantId, CreditTransaction charge) {
        return creditTransactionRepository.findAllByTenantIdAndSaleId(tenantId, charge.getSaleId()).stream()
                .filter(t -> t.getType() == CreditTransactionType.PAYMENT)
                .map(CreditTransaction::getAmount)
                .reduce(BigDecimal.ZERO.setScale(2), BigDecimal::add);
    }

    private BigDecimal invoiceOutstanding(UUID tenantId, CreditTransaction charge) {
        return charge.getAmount().subtract(invoicePaid(tenantId, charge));
    }

    @Transactional(readOnly = true)
    public java.util.List<AccountsReceivableRow> listReceivables() {
        var tenantId = TenantContext.require();
        return creditAccountRepository.findByTenantIdAndBalanceGreaterThanOrderByBalanceDesc(tenantId, BigDecimal.ZERO)
                .stream()
                .map(account -> {
                    var customer = customerRepository.findById(account.getCustomerId()).orElse(null);
                    var profile = customerCreditProfileRepository
                            .findByCustomerIdAndTenantId(account.getCustomerId(), tenantId)
                            .orElse(null);
                    return new AccountsReceivableRow(
                            account.getCustomerId(),
                            customer != null ? customer.getFirstName() + " " + customer.getLastName() : "Cliente eliminado",
                            customer != null ? customer.getPhone() : null,
                            account.getBalance(),
                            profile != null ? profile.getCreditLimit() : BigDecimal.ZERO.setScale(2));
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public java.util.List<CreditTransactionResponse> listTransactions(UUID customerId) {
        var tenantId = TenantContext.require();
        customerRepository.findByIdAndTenantIdAndActiveTrue(customerId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));

        var account = creditAccountRepository.findByCustomerIdAndTenantId(customerId, tenantId).orElse(null);
        if (account == null) {
            return java.util.List.of();
        }
        return creditTransactionRepository.findAllByTenantIdAndCreditAccountId(tenantId, account.getId())
                .stream().map(CreditTransactionResponse::from).toList();
    }
}
