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

    protected void cleanAll() {
        registerRepository.deleteAll();
        inventoryMovementRepository.deleteAll();
        userRepository.deleteAll();
        customerRepository.deleteAll();
        branchInventoryRepository.deleteAll();
        productRepository.deleteAll();
        categoryRepository.deleteAll();
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
        return objectMapper.readTree(res).path("data").path("token").asText();
    }
}
