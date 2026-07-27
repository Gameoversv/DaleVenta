package rd.dalventa.api.settings.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.settings.dto.InvoiceSettingsRequest;
import rd.dalventa.api.settings.dto.InvoiceSettingsResponse;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.repository.TenantRepository;

@Service
@RequiredArgsConstructor
public class InvoiceSettingsService {

    private final TenantRepository tenantRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public InvoiceSettingsResponse get() {
        return InvoiceSettingsResponse.from(requireTenant());
    }

    @Transactional
    public InvoiceSettingsResponse update(InvoiceSettingsRequest req) {
        var tenant = requireTenant();
        tenant.setName(req.businessName());
        tenant.setRnc(blankToNull(req.rnc()));
        tenant.setPhone(blankToNull(req.phone()));
        tenant.setEmail(blankToNull(req.email()));
        tenant.setAddress(blankToNull(req.address()));
        tenant.setCity(blankToNull(req.city()));
        tenant.setLogoUrl(blankToNull(req.logoUrl()));
        tenant.setInvoiceFooterMessage(blankToNull(req.footerMessage()));
        tenant.setInvoicePrintSize(req.printSize() != null ? req.printSize() : "LETTER");
        tenant.setInvoiceShowLogo(req.showLogo());
        tenant.setInvoiceShowRnc(req.showRnc());
        tenant.setInvoiceShowPhone(req.showPhone());
        tenant.setInvoiceShowEmail(req.showEmail());
        tenant.setInvoiceShowAddress(req.showAddress());
        tenant.setInvoiceShowCustomer(req.showCustomer());
        tenant.setInvoiceShowTax(req.showTax());
        tenant = tenantRepository.save(tenant);
        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        auditLogService.recordEvent(AuditAction.INVOICE_SETTINGS_UPDATE, "TENANT", tenant.getId(), actorId,
                "Configuracion de factura actualizada");
        return InvoiceSettingsResponse.from(tenant);
    }

    private rd.dalventa.api.tenant.domain.Tenant requireTenant() {
        return tenantRepository.findById(TenantContext.require())
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
