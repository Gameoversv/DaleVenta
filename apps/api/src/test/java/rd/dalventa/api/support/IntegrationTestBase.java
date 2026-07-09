package rd.dalventa.api.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.tenant.repository.TenantRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.auth.repository.RoleRepository;
import rd.dalventa.api.branch.repository.BranchRepository;
import rd.dalventa.api.register.repository.RegisterRepository;
import rd.dalventa.api.product.repository.CategoryRepository;
import rd.dalventa.api.product.repository.ProductRepository;
import rd.dalventa.api.inventory.repository.BranchInventoryRepository;
import rd.dalventa.api.inventory.repository.InventoryMovementRepository;
import rd.dalventa.api.denomination.repository.DenominationRepository;
import rd.dalventa.api.cashshift.repository.CashShiftRepository;
import rd.dalventa.api.cashshift.repository.CashShiftDenominationRepository;
import rd.dalventa.api.cashshift.repository.CashMovementRepository;
import rd.dalventa.api.cashshift.repository.CashMovementDenominationRepository;
import rd.dalventa.api.sale.repository.SaleRepository;
import rd.dalventa.api.sale.repository.SaleItemRepository;
import rd.dalventa.api.sale.repository.PaymentRepository;
import rd.dalventa.api.sale.repository.TransferPaymentDetailRepository;
import rd.dalventa.api.quotation.repository.QuotationRepository;
import rd.dalventa.api.quotation.repository.QuotationItemRepository;
import rd.dalventa.api.purchase.repository.PurchaseItemRepository;
import rd.dalventa.api.purchase.repository.PurchaseRepository;
import rd.dalventa.api.purchase.repository.SupplierRepository;
import rd.dalventa.api.rental.repository.RentalContractRepository;
import rd.dalventa.api.rental.repository.RentalContractItemRepository;
import rd.dalventa.api.credit.repository.CustomerCreditProfileRepository;
import rd.dalventa.api.credit.repository.CreditAccountRepository;
import rd.dalventa.api.credit.repository.CreditTransactionRepository;
import rd.dalventa.api.audit.repository.AuditLogRepository;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository userRepository;
    @Autowired protected RoleRepository roleRepository;
    @Autowired protected TenantRepository tenantRepository;
    @Autowired protected CustomerRepository customerRepository;
    @Autowired protected BranchRepository branchRepository;
    @Autowired protected RegisterRepository registerRepository;
    @Autowired protected CategoryRepository categoryRepository;
    @Autowired protected ProductRepository productRepository;
    @Autowired protected BranchInventoryRepository branchInventoryRepository;
    @Autowired protected InventoryMovementRepository inventoryMovementRepository;
    @Autowired protected DenominationRepository denominationRepository;
    @Autowired protected CashShiftRepository cashShiftRepository;
    @Autowired protected CashShiftDenominationRepository cashShiftDenominationRepository;
    @Autowired protected CashMovementRepository cashMovementRepository;
    @Autowired protected CashMovementDenominationRepository cashMovementDenominationRepository;
    @Autowired protected SaleRepository saleRepository;
    @Autowired protected SaleItemRepository saleItemRepository;
    @Autowired protected PaymentRepository paymentRepository;
    @Autowired protected TransferPaymentDetailRepository transferPaymentDetailRepository;
    @Autowired protected QuotationRepository quotationRepository;
    @Autowired protected QuotationItemRepository quotationItemRepository;
    @Autowired protected PurchaseItemRepository purchaseItemRepository;
    @Autowired protected PurchaseRepository purchaseRepository;
    @Autowired protected SupplierRepository supplierRepository;
    @Autowired protected RentalContractRepository rentalContractRepository;
    @Autowired protected RentalContractItemRepository rentalContractItemRepository;
    @Autowired protected CustomerCreditProfileRepository customerCreditProfileRepository;
    @Autowired protected CreditAccountRepository creditAccountRepository;
    @Autowired protected CreditTransactionRepository creditTransactionRepository;
    @Autowired protected AuditLogRepository auditLogRepository;

    protected void cleanAll() {
        auditLogRepository.deleteAll();
        customerCreditProfileRepository.deleteAll();
        creditTransactionRepository.deleteAll();
        creditAccountRepository.deleteAll();
        cashMovementDenominationRepository.deleteAll();
        cashMovementRepository.deleteAll();
        transferPaymentDetailRepository.deleteAll();
        paymentRepository.deleteAll();
        rentalContractItemRepository.deleteAll();
        rentalContractRepository.deleteAll();
        saleItemRepository.deleteAll();
        saleRepository.deleteAll();
        quotationItemRepository.deleteAll();
        quotationRepository.deleteAll();
        purchaseItemRepository.deleteAll();
        purchaseRepository.deleteAll();
        cashShiftDenominationRepository.deleteAll();
        cashShiftRepository.deleteAll();
        registerRepository.deleteAll();
        inventoryMovementRepository.deleteAll();
        userRepository.deleteAll();
        customerRepository.deleteAll();
        branchInventoryRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        supplierRepository.deleteAll();
        denominationRepository.deleteAll();
        branchRepository.deleteAll();
        tenantRepository.deleteAll();
    }

    protected String registerTenantAndGetToken(String email, String password) throws Exception {
        var body = Map.of(
                "tenant_name", "DaleVenta Test",
                "admin_name", "Admin Test",
                "admin_email", email,
                "admin_password", password
        );
        var res = mockMvc.perform(post("/api/tenants/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        var token = objectMapper.readTree(res).path("data").path("token").asText();
        userRepository.findByEmail(email).ifPresent(user -> {
            var tenant = tenantRepository.findById(user.getTenantId()).orElseThrow();
            tenant.setMultiBranchEnabled(true);
            tenant.setMultiRegisterEnabled(true);
            tenantRepository.save(tenant);
        });
        return token;
    }
}
