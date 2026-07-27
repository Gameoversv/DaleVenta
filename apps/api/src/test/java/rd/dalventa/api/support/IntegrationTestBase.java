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
import rd.dalventa.api.purchase.repository.PurchasePaymentRepository;
import rd.dalventa.api.purchase.repository.PurchaseRepository;
import rd.dalventa.api.purchase.repository.SupplierRepository;
import rd.dalventa.api.rental.repository.RentalContractRepository;
import rd.dalventa.api.rental.repository.RentalContractItemRepository;
import rd.dalventa.api.credit.repository.CustomerCreditProfileRepository;
import rd.dalventa.api.credit.repository.CreditAccountRepository;
import rd.dalventa.api.credit.repository.CreditTransactionRepository;
import rd.dalventa.api.audit.repository.AuditLogRepository;
import rd.dalventa.api.report.repository.DailyClosingRepository;
import rd.dalventa.api.fiscal.repository.FiscalProfileRepository;
import rd.dalventa.api.fiscal.repository.FiscalReceiptSequenceRepository;

import rd.dalventa.api.auth.domain.RoleName;
import rd.dalventa.api.tenant.domain.Tenant;

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    protected static final String DEFAULT_PASSWORD = "Secret123!";

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
    @Autowired protected PurchasePaymentRepository purchasePaymentRepository;
    @Autowired protected PurchaseRepository purchaseRepository;
    @Autowired protected SupplierRepository supplierRepository;
    @Autowired protected RentalContractRepository rentalContractRepository;
    @Autowired protected RentalContractItemRepository rentalContractItemRepository;
    @Autowired protected CustomerCreditProfileRepository customerCreditProfileRepository;
    @Autowired protected CreditAccountRepository creditAccountRepository;
    @Autowired protected CreditTransactionRepository creditTransactionRepository;
    @Autowired protected AuditLogRepository auditLogRepository;
    @Autowired protected DailyClosingRepository dailyClosingRepository;
    @Autowired protected FiscalProfileRepository fiscalProfileRepository;
    @Autowired protected FiscalReceiptSequenceRepository fiscalReceiptSequenceRepository;

    /**
     * The Spring context is shared across every integration test class, so a class that aborts
     * mid-way can leave rows behind and break unrelated tests with "email already registered".
     * Starting from a clean database makes each test independent of the run order.
     */
    @org.junit.jupiter.api.BeforeEach
    void cleanBeforeEachTest() {
        cleanAll();
    }

    protected void cleanAll() {
        auditLogRepository.deleteAll();
        // Daily closings point at registers, so they have to go before them or cleanup aborts.
        dailyClosingRepository.deleteAll();
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
        // Sales carry an FK to the NCF sequence that stamped them, so sequences go after sales.
        fiscalReceiptSequenceRepository.deleteAll();
        fiscalProfileRepository.deleteAll();
        quotationItemRepository.deleteAll();
        quotationRepository.deleteAll();
        purchasePaymentRepository.deleteAll();
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

    /**
     * Turns on every optional tenant module (purchases, rentals, fiscal) so integration tests for
     * those modules are not blocked by the per-tenant feature gate.
     */
    protected void enableAllModules(String adminEmail) {
        var user = userRepository.findByEmail(adminEmail).orElseThrow();
        var tenant = tenantRepository.findById(user.getTenantId()).orElseThrow();
        tenant.setPurchaseModuleEnabled(true);
        tenant.setRentalModuleEnabled(true);
        tenant.setFiscalModuleEnabled(true);
        tenantRepository.save(tenant);
    }

    protected Tenant tenantOf(String email) {
        var user = userRepository.findByEmail(email).orElseThrow();
        return tenantRepository.findById(user.getTenantId()).orElseThrow();
    }

    protected UUID userIdOf(String email) {
        return userRepository.findByEmail(email).orElseThrow().getId();
    }

    /** Creates a second user inside the caller's tenant and returns its id. */
    protected UUID createUser(String adminToken, String name, String email, String password, RoleName role)
            throws Exception {
        var body = Map.of("name", name, "email", email, "password", password, "role", role.name());
        var res = mockMvc.perform(post("/api/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        return UUID.fromString(objectMapper.readTree(res).path("data").path("id").asText());
    }

    protected String login(String email, String password) throws Exception {
        var res = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("email", email, "password", password))))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).path("data").path("token").asText();
    }

    protected String bearer(String token) {
        return "Bearer " + token;
    }

    protected String extractId(String responseBody) throws Exception {
        return objectMapper.readTree(responseBody).path("data").path("id").asText();
    }

    protected String postJson(String token, String url, String body) throws Exception {
        return mockMvc.perform(post(url)
                        .header("Authorization", bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();
    }

    /**
     * Provisions a tenant with every optional module enabled plus branch, register, category,
     * two products (one rentable), a customer, a supplier, stock and an open cash shift.
     */
    protected TenantFixture provisionTenant(String email) throws Exception {
        String token = registerTenantAndGetToken(email, DEFAULT_PASSWORD);
        enableAllModules(email);
        var tenantId = tenantOf(email).getId();

        var branchId = UUID.fromString(extractId(postJson(token, "/api/branches",
                "{\"name\":\"Sucursal Centro\",\"address\":\"Calle Duarte 12\"}")));
        var registerId = UUID.fromString(extractId(postJson(token, "/api/registers",
                "{\"name\":\"Caja 1\",\"branchId\":\"" + branchId + "\"}")));
        var categoryId = UUID.fromString(extractId(postJson(token, "/api/categories",
                "{\"name\":\"Bizcochos\"}")));
        var productId = UUID.fromString(extractId(postJson(token, "/api/products",
                productBody(categoryId, "BIZ-001", "Bizcocho", false))));
        var rentableProductId = UUID.fromString(extractId(postJson(token, "/api/products",
                productBody(categoryId, "REN-001", "Bandeja de alquiler", true))));
        var customerId = UUID.fromString(extractId(postJson(token, "/api/customers",
                "{\"firstName\":\"Ana\",\"lastName\":\"Perez\",\"phone\":\"8090000000\"}")));
        var supplierId = UUID.fromString(extractId(postJson(token, "/api/suppliers",
                "{\"name\":\"Distribuidora Duarte\",\"phone\":\"8091111111\"}")));

        postJson(token, "/api/inventory/movements",
                "{\"branchId\":\"" + branchId + "\",\"productId\":\"" + productId
                        + "\",\"type\":\"ENTRY\",\"quantity\":50,\"reason\":\"Compra inicial\"}");
        postJson(token, "/api/inventory/movements",
                "{\"branchId\":\"" + branchId + "\",\"productId\":\"" + rentableProductId
                        + "\",\"type\":\"ENTRY\",\"quantity\":10,\"reason\":\"Compra inicial\"}");

        var denomination500Id = denomination500(token);
        var cashShiftId = UUID.fromString(extractId(postJson(token, "/api/cash-shifts/open",
                "{\"registerId\":\"" + registerId + "\",\"openingCounts\":[{\"denominationId\":\""
                        + denomination500Id + "\",\"quantity\":4}]}")));

        return new TenantFixture(email, token, tenantId, branchId, registerId, categoryId, productId,
                rentableProductId, customerId, supplierId, cashShiftId, denomination500Id);
    }

    private String productBody(UUID categoryId, String code, String description, boolean rentable) {
        return "{\"categoryId\":\"" + categoryId + "\",\"internalCode\":\"" + code + "\",\"barcode\":null,"
                + "\"description\":\"" + description + "\",\"unit\":\"unidad\",\"cost\":\"100.00\","
                + "\"salePrice\":\"250.00\",\"wholesalePrice\":\"200.00\",\"taxRate\":\"0.00\","
                + "\"tracksInventory\":true,\"rentable\":" + rentable + "}";
    }

    private UUID denomination500(String token) throws Exception {
        var res = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/denominations").header("Authorization", bearer(token)))
                .andReturn().getResponse().getContentAsString();
        for (var node : objectMapper.readTree(res).path("data")) {
            if (node.path("value").asText().startsWith("500")) {
                return UUID.fromString(node.path("id").asText());
            }
        }
        throw new IllegalStateException("Seeded denomination of 500 not found");
    }
}
