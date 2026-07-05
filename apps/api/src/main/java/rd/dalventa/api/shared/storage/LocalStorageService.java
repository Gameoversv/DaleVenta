package rd.dalventa.api.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Slf4j
@Service
@ConditionalOnMissingBean(R2StorageService.class)
public class LocalStorageService implements StorageService {

    private final Path uploadDir;
    private final String baseUrl;

    public LocalStorageService(
            @Value("${app.storage.local.dir:uploads}") String dir,
            @Value("${app.storage.local.base-url:http://localhost:8080/api/files}") String baseUrl
    ) {
        this.uploadDir = Paths.get(dir).toAbsolutePath();
        this.baseUrl = baseUrl;
        try {
            Files.createDirectories(this.uploadDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create upload dir: " + this.uploadDir, e);
        }
        log.info("LocalStorageService: storing files in {}", this.uploadDir);
    }

    @Override
    public String upload(String filename, byte[] bytes, String contentType) {
        try {
            Path target = uploadDir.resolve(filename);
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
            return baseUrl + "/" + filename;
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write file: " + filename, e);
        }
    }

    @Override
    public void delete(String url) {
        String filename = url.substring(url.lastIndexOf('/') + 1);
        try {
            Files.deleteIfExists(uploadDir.resolve(filename));
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", filename, e.getMessage());
        }
    }
}
