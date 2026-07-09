package rd.dalventa.api.purchase.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import rd.dalventa.api.purchase.domain.Supplier;
import rd.dalventa.api.purchase.dto.SupplierRequest;
import rd.dalventa.api.purchase.dto.SupplierResponse;
import rd.dalventa.api.purchase.repository.SupplierRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final TenantRepository tenantRepository;

    @Transactional(readOnly = true)
    public List<SupplierResponse> list(String q, boolean includeInactive) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        return supplierRepository.search(tenantId, q, includeInactive)
                .stream()
                .map(SupplierResponse::from)
                .toList();
    }

    @Transactional
    public SupplierResponse create(SupplierRequest req) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        var supplier = new Supplier();
        supplier.setTenantId(tenantId);
        apply(supplier, req);
        supplier.setActive(req.active() == null || req.active());
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public SupplierResponse update(UUID id, SupplierRequest req) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        var supplier = supplierRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        apply(supplier, req);
        if (req.active() != null) {
            supplier.setActive(req.active());
        }
        return SupplierResponse.from(supplierRepository.save(supplier));
    }

    @Transactional
    public void deactivate(UUID id) {
        var tenantId = TenantContext.require();
        ensureModuleEnabled(tenantId);
        var supplier = supplierRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Proveedor no encontrado"));
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }

    private void apply(Supplier supplier, SupplierRequest req) {
        supplier.setName(req.name());
        supplier.setContactName(req.contactName());
        supplier.setPhone(req.phone());
        supplier.setEmail(req.email());
        supplier.setAddress(req.address());
        supplier.setTaxId(req.taxId());
        supplier.setNotes(req.notes());
    }

    private void ensureModuleEnabled(UUID tenantId) {
        tenantRepository.findById(tenantId)
                .filter(Tenant::isPurchaseModuleEnabled)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "Modulo de compras y proveedores no esta activo para este tenant"
                ));
    }
}
