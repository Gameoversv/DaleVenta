package rd.dalventa.api.shared.storage;

public interface StorageService {
    String upload(String filename, byte[] bytes, String contentType);
    void delete(String url);
}
