package rd.dalventa.api.reception.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import rd.dalventa.api.reception.domain.Reception;
import rd.dalventa.api.reception.dto.CreateReceptionRequest;
import rd.dalventa.api.reception.dto.ReceptionResponse;
import rd.dalventa.api.reception.dto.SaveSignatureRequest;
import rd.dalventa.api.reception.repository.ReceptionRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.storage.StorageService;
import rd.dalventa.api.shared.web.ApiResponse;
import rd.dalventa.api.vehicle.repository.VehicleRepository;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReceptionService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "heic");

    private static final Map<String, Set<String>> ALLOWED_CONTENT_TYPES_BY_EXTENSION = Map.of(
            "jpg", Set.of("image/jpeg"),
            "jpeg", Set.of("image/jpeg"),
            "png", Set.of("image/png"),
            "webp", Set.of("image/webp"),
            "heic", Set.of("image/heic", "image/heif")
    );

    private final ReceptionRepository receptionRepository;
    private final VehicleRepository vehicleRepository;
    private final StorageService storageService;

    @Transactional
    public ReceptionResponse create(CreateReceptionRequest req) {
        UUID tenantId = TenantContext.require();
        var vehicle = vehicleRepository.findByIdAndTenantIdAndActiveTrue(req.vehicleId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Vehículo no encontrado: " + req.vehicleId()));

        var reception = new Reception();
        reception.setTenantId(tenantId);
        reception.setVehicle(vehicle);
        reception.setEntryKm(req.entryKm());
        reception.setReportedProblem(req.reportedProblem());
        reception.setChecklist(req.checklist().toDomain());
        reception.setNotes(req.notes());

        return ReceptionResponse.from(receptionRepository.save(reception));
    }

    @Transactional
    public ReceptionResponse addPhoto(UUID id, MultipartFile file) throws IOException {
        UUID tenantId = TenantContext.require();
        var reception = receptionRepository.findByIdWithVehicle(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Recepción no encontrada: " + id));

        String ext = validateAndGetExtension(file);
        String filename = "receptions/" + id + "/" + UUID.randomUUID() + "." + ext;
        String url = storageService.upload(filename, file.getBytes(), file.getContentType());

        reception.getPhotos().add(url);
        return ReceptionResponse.from(receptionRepository.save(reception));
    }

    @Transactional(readOnly = true)
    public ReceptionResponse findById(UUID id) {
        UUID tenantId = TenantContext.require();
        return receptionRepository.findByIdWithVehicle(id, tenantId)
                .map(ReceptionResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("Recepción no encontrada: " + id));
    }

    @Transactional(readOnly = true)
    public ApiResponse<List<ReceptionResponse>> findAll(int page) {
        UUID tenantId = TenantContext.require();
        var pageable = PageRequest.of(page, 20, Sort.by("createdAt").descending());
        var result = receptionRepository.findAllActive(tenantId, pageable);
        return ApiResponse.paged(
                result.getContent().stream().map(ReceptionResponse::from).toList(),
                result.getTotalElements(),
                page,
                20
        );
    }

    @Transactional(readOnly = true)
    public List<ReceptionResponse> findByVehicle(UUID vehicleId) {
        UUID tenantId = TenantContext.require();
        return receptionRepository.findByVehicleId(tenantId, vehicleId)
                .stream()
                .map(ReceptionResponse::from)
                .toList();
    }

    @Transactional
    public ReceptionResponse saveSignature(UUID id, SaveSignatureRequest req) {
        UUID tenantId = TenantContext.require();
        var reception = receptionRepository.findByIdWithVehicle(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Recepción no encontrada: " + id));
        if (req.signatureData() == null || req.signatureData().isBlank()) {
            throw new IllegalArgumentException("Firma no puede estar vacía");
        }
        reception.setSignatureData(req.signatureData());
        reception.setSignedAt(Instant.now());
        return ReceptionResponse.from(receptionRepository.save(reception));
    }

    /**
     * Validates the uploaded photo against a whitelist of image extensions and content types,
     * checking both the client-declared content type and the actual filename extension so
     * neither alone can be used to smuggle in disallowed file types.
     */
    private String validateAndGetExtension(MultipartFile file) {
        String ext = getExtension(file.getOriginalFilename()).toLowerCase();
        if (ext.isBlank() || !ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException(
                    "Tipo de archivo no permitido. Formatos aceptados: " + String.join(", ", ALLOWED_EXTENSIONS));
        }

        String contentType = file.getContentType();
        Set<String> allowedContentTypes = ALLOWED_CONTENT_TYPES_BY_EXTENSION.get(ext);
        if (contentType == null || !allowedContentTypes.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException(
                    "El tipo de contenido del archivo no coincide con una imagen permitida");
        }

        return ext;
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 && dot < filename.length() - 1 ? filename.substring(dot + 1) : "";
    }
}
