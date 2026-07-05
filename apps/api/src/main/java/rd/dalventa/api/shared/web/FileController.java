package rd.dalventa.api.shared.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import rd.dalventa.api.reception.repository.ReceptionRepository;
import rd.dalventa.api.shared.domain.TenantContext;
import rd.dalventa.api.shared.storage.R2StorageService;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Serves locally-stored uploads (used when R2 storage is not configured, e.g. local dev).
 * Requires authentication (see SecurityConfig) and enforces tenant-scoped ownership: a caller can
 * only fetch a file that belongs to a reception owned by their own tenant, following the same
 * tenant-scoping pattern used by ReceptionRepository/ReceptionService elsewhere in the codebase.
 */
@RestController
@RequestMapping("/api/files")
@ConditionalOnMissingBean(R2StorageService.class)
public class FileController {

    private final Path uploadDir;
    private final ReceptionRepository receptionRepository;

    public FileController(
            @Value("${app.storage.local.dir:uploads}") String dir,
            ReceptionRepository receptionRepository
    ) {
        this.uploadDir = Paths.get(dir).toAbsolutePath();
        this.receptionRepository = receptionRepository;
    }

    @GetMapping("/{*filename}")
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) throws IOException {
        // {*filename} (multi-segment catch-all) includes the leading "/"; strip it so the
        // rest of this method keeps working with a plain relative path like
        // "receptions/{id}/{uuid}.jpg".
        if (filename.startsWith("/")) {
            filename = filename.substring(1);
        }
        Path file = uploadDir.resolve(filename).normalize();
        if (!file.startsWith(uploadDir)) {
            return ResponseEntity.badRequest().build();
        }

        if (!isOwnedByCurrentTenant(filename)) {
            return ResponseEntity.status(403).build();
        }

        Resource resource;
        try {
            resource = new UrlResource(file.toUri());
        } catch (MalformedURLException e) {
            return ResponseEntity.notFound().build();
        }
        if (!resource.exists() || !resource.isReadable()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }

    /**
     * All files currently uploaded through this API belong to a reception, stored under
     * {@code receptions/{receptionId}/...}. Deny by default if the path doesn't match that
     * pattern or the reception isn't owned by the caller's tenant.
     */
    private boolean isOwnedByCurrentTenant(String filename) {
        UUID tenantId = TenantContext.get();
        if (tenantId == null) {
            return false;
        }

        String[] parts = filename.replace('\\', '/').split("/");
        if (parts.length < 2 || !"receptions".equals(parts[0])) {
            return false;
        }

        UUID receptionId;
        try {
            receptionId = UUID.fromString(parts[1]);
        } catch (IllegalArgumentException e) {
            return false;
        }

        return receptionRepository.findByIdWithVehicle(receptionId, tenantId)
                .map(reception -> reception.getPhotos().stream().anyMatch(url -> url.endsWith(filename)))
                .orElse(false);
    }
}
