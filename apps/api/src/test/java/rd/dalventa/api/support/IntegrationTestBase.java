package rd.dalventa.api.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.invoice.repository.InvoiceRepository;
import rd.dalventa.api.payment.repository.PaymentRepository;
import rd.dalventa.api.quote.repository.QuoteRepository;
import rd.dalventa.api.reception.repository.ReceptionRepository;
import rd.dalventa.api.tenant.repository.TenantRepository;
import rd.dalventa.api.auth.repository.UserRepository;
import rd.dalventa.api.vehicle.repository.VehicleRepository;
import rd.dalventa.api.workorder.repository.WorkOrderRepository;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class IntegrationTestBase {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;
    @Autowired protected UserRepository userRepository;
    @Autowired protected TenantRepository tenantRepository;
    @Autowired protected CustomerRepository customerRepository;
    @Autowired protected VehicleRepository vehicleRepository;
    @Autowired protected ReceptionRepository receptionRepository;
    @Autowired protected WorkOrderRepository workOrderRepository;
    @Autowired protected QuoteRepository quoteRepository;
    @Autowired protected InvoiceRepository invoiceRepository;
    @Autowired protected PaymentRepository paymentRepository;

    protected void cleanAll() {
        paymentRepository.deleteAll();
        invoiceRepository.deleteAll();
        quoteRepository.deleteAll();
        workOrderRepository.deleteAll();
        receptionRepository.deleteAll();
        vehicleRepository.deleteAll();
        userRepository.deleteAll();     // before customers: portal users have customer_id FK
        customerRepository.deleteAll();
        tenantRepository.deleteAll();
    }

    protected String registerTenantAndGetToken(String email, String password) throws Exception {
        var body = Map.of(
                "tenant_name", "Taller Test",
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

    protected Map<String, Object> buildChecklist() {
        return Map.of(
                "exterior", Map.of("scratches", "NA", "dents", "NA", "lights", "OK"),
                "interior", Map.of("radio", "OK", "screen", "OK", "mats", "OK"),
                "mechanical", Map.of("oil_level", "OK", "coolant", "OK", "battery", "OK")
        );
    }
}
