package rd.dalventa.api.customer.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.customer.domain.Customer;
import rd.dalventa.api.customer.dto.CreateCustomerRequest;
import rd.dalventa.api.customer.dto.CustomerResponse;
import rd.dalventa.api.customer.dto.UpdateCustomerRequest;
import rd.dalventa.api.customer.repository.CustomerRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository repository;

    public Page<CustomerResponse> search(String q, Pageable pageable) {
        return repository.search(TenantContext.require(), q, pageable).map(CustomerResponse::from);
    }

    public CustomerResponse findById(UUID id) {
        return repository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .map(CustomerResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + id));
    }

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        UUID tenantId = TenantContext.require();
        if (req.documentId() != null && !req.documentId().isBlank()
                && repository.existsByDocumentIdAndTenantIdAndActiveTrue(req.documentId(), tenantId)) {
            throw new IllegalArgumentException("Ya existe un cliente con esa cédula/RNC");
        }

        var customer = new Customer();
        customer.setTenantId(tenantId);
        customer.setFirstName(req.firstName());
        customer.setLastName(req.lastName());
        customer.setPhone(req.phone());
        customer.setWhatsapp(req.whatsapp());
        customer.setEmail(req.email());
        customer.setAddress(req.address());
        customer.setDocumentId(req.documentId());

        return CustomerResponse.from(repository.save(customer));
    }

    @Transactional
    public CustomerResponse update(UUID id, UpdateCustomerRequest req) {
        var customer = repository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + id));

        if (req.firstName() != null) customer.setFirstName(req.firstName());
        if (req.lastName() != null) customer.setLastName(req.lastName());
        if (req.phone() != null) customer.setPhone(req.phone());
        if (req.whatsapp() != null) customer.setWhatsapp(req.whatsapp());
        if (req.email() != null) customer.setEmail(req.email());
        if (req.address() != null) customer.setAddress(req.address());
        if (req.documentId() != null) customer.setDocumentId(req.documentId());

        return CustomerResponse.from(repository.save(customer));
    }

    @Transactional
    public void delete(UUID id) {
        var customer = repository.findByIdAndTenantIdAndActiveTrue(id, TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado: " + id));
        customer.setActive(false);
        repository.save(customer);
    }
}
