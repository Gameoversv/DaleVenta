package rd.dalventa.api.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;

@Slf4j
@Service
@ConditionalOnExpression("'${app.storage.r2.endpoint:}'.length() > 0")
public class R2StorageService implements StorageService {

    private final S3Client s3;
    private final String bucket;
    private final String publicUrl;

    public R2StorageService(
            @Value("${app.storage.r2.endpoint}") String endpoint,
            @Value("${app.storage.r2.bucket}") String bucket,
            @Value("${app.storage.r2.access-key}") String accessKey,
            @Value("${app.storage.r2.secret-key}") String secretKey,
            @Value("${app.storage.r2.public-url}") String publicUrl
    ) {
        this.bucket = bucket;
        this.publicUrl = publicUrl;
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
        log.info("R2StorageService: bucket={}, publicUrl={}", bucket, publicUrl);
    }

    @Override
    public String upload(String filename, byte[] bytes, String contentType) {
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(bucket)
                        .key(filename)
                        .contentType(contentType)
                        .build(),
                RequestBody.fromBytes(bytes)
        );
        return publicUrl + "/" + filename;
    }

    @Override
    public void delete(String url) {
        String key = url.substring(url.lastIndexOf('/') + 1);
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }
}
