package rd.dalventa.api.fiscal.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import rd.dalventa.api.audit.domain.AuditAction;
import rd.dalventa.api.audit.service.AuditLogService;
import rd.dalventa.api.fiscal.domain.FiscalReceiptSequence;
import rd.dalventa.api.fiscal.domain.FiscalReceiptType;
import rd.dalventa.api.fiscal.dto.FiscalProfileRequest;
import rd.dalventa.api.fiscal.dto.FiscalProfileResponse;
import rd.dalventa.api.fiscal.dto.FiscalReceiptSequenceRequest;
import rd.dalventa.api.fiscal.dto.FiscalReceiptSequenceResponse;
import rd.dalventa.api.fiscal.repository.FiscalProfileRepository;
import rd.dalventa.api.fiscal.repository.FiscalReceiptSequenceRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.security.CurrentUserProvider;
import rd.dalventa.api.shared.web.ResourceNotFoundException;
import rd.dalventa.api.tenant.domain.Tenant;
import rd.dalventa.api.tenant.repository.TenantRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FiscalService {

    private final TenantRepository tenantRepository;
    private final FiscalProfileRepository fiscalProfileRepository;
    private final FiscalReceiptSequenceRepository fiscalReceiptSequenceRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public FiscalProfileResponse getProfile() {
        var tenantId = TenantContext.require();
        requireFiscalEnabled(tenantId);
        return fiscalProfileRepository.findByTenantId(tenantId)
                .map(FiscalProfileResponse::from)
                .orElseGet(() -> defaultProfile(tenantId));
    }

    @Transactional
    public FiscalProfileResponse updateProfile(FiscalProfileRequest req) {
        var tenantId = TenantContext.require();
        requireFiscalEnabled(tenantId);
        var profile = fiscalProfileRepository.findByTenantId(tenantId)
                .orElseGet(rd.dalventa.api.fiscal.domain.FiscalProfile::new);
        profile.setTenantId(tenantId);
        profile.setBusinessName(req.businessName().trim());
        profile.setTradeName(blankToNull(req.tradeName()));
        profile.setRnc(req.rnc().trim());
        profile.setFiscalAddress(blankToNull(req.fiscalAddress()));
        profile.setPhone(blankToNull(req.phone()));
        profile.setEmail(blankToNull(req.email()));
        profile.setTaxRegime(blankToNull(req.taxRegime()));
        profile = fiscalProfileRepository.save(profile);
        recordEvent(AuditAction.FISCAL_PROFILE_UPDATE, "FISCAL_PROFILE", profile.getId(), "Datos fiscales actualizados");
        return FiscalProfileResponse.from(profile);
    }

    @Transactional(readOnly = true)
    public List<FiscalReceiptSequenceResponse> listSequences() {
        var tenantId = TenantContext.require();
        requireFiscalEnabled(tenantId);
        return fiscalReceiptSequenceRepository.findAllByTenantIdOrderByReceiptTypeAscCreatedAtDesc(tenantId)
                .stream()
                .map(FiscalReceiptSequenceResponse::from)
                .toList();
    }

    @Transactional
    public FiscalReceiptSequenceResponse createSequence(FiscalReceiptSequenceRequest req) {
        var tenantId = TenantContext.require();
        requireFiscalEnabled(tenantId);
        validateSequence(req);
        var sequence = new FiscalReceiptSequence();
        sequence.setTenantId(tenantId);
        apply(sequence, req);
        sequence = fiscalReceiptSequenceRepository.save(sequence);
        recordEvent(AuditAction.FISCAL_SEQUENCE_UPDATE, "FISCAL_SEQUENCE", sequence.getId(), "Secuencia NCF creada");
        return FiscalReceiptSequenceResponse.from(sequence);
    }

    @Transactional
    public FiscalReceiptSequenceResponse updateSequence(UUID id, FiscalReceiptSequenceRequest req) {
        var tenantId = TenantContext.require();
        requireFiscalEnabled(tenantId);
        validateSequence(req);
        var sequence = fiscalReceiptSequenceRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Secuencia fiscal no encontrada"));
        apply(sequence, req);
        sequence = fiscalReceiptSequenceRepository.save(sequence);
        recordEvent(AuditAction.FISCAL_SEQUENCE_UPDATE, "FISCAL_SEQUENCE", sequence.getId(), "Secuencia NCF actualizada");
        return FiscalReceiptSequenceResponse.from(sequence);
    }

    @Transactional
    public IssuedFiscalReceipt issueReceipt(UUID tenantId, FiscalReceiptType receiptType) {
        requireFiscalEnabled(tenantId);
        var sequence = fiscalReceiptSequenceRepository.findByTenantIdAndReceiptTypeAndActiveTrue(tenantId, receiptType)
                .orElseThrow(() -> new ResourceNotFoundException("No hay secuencia NCF activa para " + receiptType));
        if (sequence.getExpiresAt().isBefore(java.time.LocalDate.now())) {
            throw new IllegalArgumentException("La secuencia NCF " + receiptType + " esta vencida");
        }
        if (sequence.getNextNumber() > sequence.getEndNumber()) {
            throw new IllegalArgumentException("La secuencia NCF " + receiptType + " esta agotada");
        }
        var ncf = sequence.getPrefix() + String.format("%08d", sequence.getNextNumber());
        sequence.setNextNumber(sequence.getNextNumber() + 1);
        fiscalReceiptSequenceRepository.save(sequence);
        return new IssuedFiscalReceipt(sequence.getId(), receiptType, ncf);
    }

    private FiscalProfileResponse defaultProfile(UUID tenantId) {
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"));
        return new FiscalProfileResponse(tenant.getName(), null, "", tenant.getAddress(), tenant.getPhone(), tenant.getEmail(), null);
    }

    private Tenant requireFiscalEnabled(UUID tenantId) {
        var tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Negocio no encontrado"));
        if (!tenant.isFiscalModuleEnabled()) {
            throw new IllegalStateException("El modulo fiscal no esta activo para este tenant");
        }
        return tenant;
    }

    private void apply(FiscalReceiptSequence sequence, FiscalReceiptSequenceRequest req) {
        sequence.setReceiptType(req.receiptType());
        sequence.setPrefix((req.prefix() == null || req.prefix().isBlank() ? req.receiptType().name() : req.prefix().trim()).toUpperCase());
        sequence.setStartNumber(req.startNumber());
        sequence.setNextNumber(req.nextNumber());
        sequence.setEndNumber(req.endNumber());
        sequence.setExpiresAt(req.expiresAt());
        sequence.setActive(req.active());
    }

    private void validateSequence(FiscalReceiptSequenceRequest req) {
        if (req.nextNumber() < req.startNumber()) {
            throw new IllegalArgumentException("El proximo numero no puede ser menor que el inicial");
        }
        if (req.endNumber() < req.nextNumber()) {
            throw new IllegalArgumentException("El numero final no puede ser menor que el proximo");
        }
    }

    private void recordEvent(AuditAction action, String entityType, UUID entityId, String description) {
        var actorId = currentUserProvider.current()
                .orElseThrow(() -> new IllegalStateException("Usuario no autenticado"))
                .getId();
        auditLogService.recordEvent(action, entityType, entityId, actorId, description);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record IssuedFiscalReceipt(UUID sequenceId, FiscalReceiptType receiptType, String ncf) {
    }
}
