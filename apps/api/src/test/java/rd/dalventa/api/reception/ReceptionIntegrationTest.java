package rd.dalventa.api.reception;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import rd.dalventa.api.support.IntegrationTestBase;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ReceptionIntegrationTest extends IntegrationTestBase {

    private String token;
    private String vehicleId;

    @BeforeEach
    void setUp() throws Exception {
        cleanAll();
        token = registerTenantAndGetToken("admin@test.rd", "pass1234");

        var custRes = mockMvc.perform(post("/api/customers")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "first_name", "Juan", "last_name", "Perez",
                                "phone", "8091234567"))))
                .andReturn().getResponse().getContentAsString();
        String customerId = objectMapper.readTree(custRes).path("data").path("id").asText();

        var vehRes = mockMvc.perform(post("/api/vehicles")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "brand", "Toyota", "model", "Corolla", "year", 2019,
                                "license_plate", "REC-001", "customer_id", customerId))))
                .andReturn().getResponse().getContentAsString();
        vehicleId = objectMapper.readTree(vehRes).path("data").path("id").asText();
    }

    private Map<String, Object> buildDetailedChecklist() {
        return Map.of(
                "exterior", Map.of("scratches", "OK", "dents", "NA", "lights", "LEVE"),
                "interior", Map.of("radio", "OK", "screen", "NA", "mats", "OK"),
                "mechanical", Map.of("oil_level", "GRAVE", "coolant", "OK", "battery", "NA")
        );
    }

    @Test
    @DisplayName("POST /api/receptions - crea recepción con checklist")
    void createReception_valid_returns201() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 52000,
                "reported_problem", "Ruido en frenos delanteros",
                "checklist", buildDetailedChecklist()
        );

        mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.vehicle_id").value(vehicleId))
                .andExpect(jsonPath("$.data.entry_km").value(52000))
                .andExpect(jsonPath("$.data.reported_problem").value("Ruido en frenos delanteros"))
                .andExpect(jsonPath("$.data.checklist.exterior.scratches").value("OK"))
                .andExpect(jsonPath("$.data.checklist.mechanical.oil_level").value("GRAVE"))
                .andExpect(jsonPath("$.data.photos").isArray());
    }

    @Test
    @DisplayName("POST /api/receptions - falla sin vehicle_id")
    void createReception_missingVehicle_returns400() throws Exception {
        var body = Map.of(
                "entry_km", 52000,
                "reported_problem", "Falla motor",
                "checklist", buildDetailedChecklist()
        );

        mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/receptions/:id - retorna recepción existente")
    void findById_existing_returns200() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 30000,
                "reported_problem", "Cambio de aceite",
                "checklist", buildDetailedChecklist()
        );

        var createRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(createRes).path("data").path("id").asText();

        mockMvc.perform(get("/api/receptions/" + receptionId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(receptionId))
                .andExpect(jsonPath("$.data.customer_name").exists());
    }

    @Test
    @DisplayName("GET /api/vehicles/:id/receptions - lista recepciones del vehículo")
    void listByVehicle_returns200() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 10000,
                "reported_problem", "Revisión general",
                "checklist", buildDetailedChecklist()
        );

        mockMvc.perform(post("/api/receptions")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)));

        mockMvc.perform(get("/api/vehicles/" + vehicleId + "/receptions")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("POST /api/receptions/:id/photos - sube foto local")
    void addPhoto_localStorage_addsUrl() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 70000,
                "reported_problem", "Revisión pre-compra",
                "checklist", buildDetailedChecklist()
        );

        var createRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(createRes).path("data").path("id").asText();

        var photo = new MockMultipartFile("file", "frente.jpg", "image/jpeg",
                "fake-image-bytes".getBytes());

        mockMvc.perform(multipart("/api/receptions/" + receptionId + "/photos")
                        .file(photo)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.photos", hasSize(1)))
                .andExpect(jsonPath("$.data.photos[0]", containsString("receptions/")));
    }

    @Test
    @DisplayName("GET /api/receptions/:id - 404 si no existe")
    void findById_notFound_returns400() throws Exception {
        mockMvc.perform(get("/api/receptions/00000000-0000-0000-0000-000000000000")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/receptions/:id/photos - rechaza extensión no permitida")
    void addPhoto_disallowedExtension_returns400() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 15000,
                "reported_problem", "Prueba archivo invalido",
                "checklist", buildDetailedChecklist()
        );
        var createRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(createRes).path("data").path("id").asText();

        var malicious = new MockMultipartFile("file", "payload.exe", "application/octet-stream",
                "not-an-image".getBytes());

        mockMvc.perform(multipart("/api/receptions/" + receptionId + "/photos")
                        .file(malicious)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/receptions/:id/photos - rechaza content-type que no coincide con la extensión")
    void addPhoto_mismatchedContentType_returns400() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 15000,
                "reported_problem", "Prueba content-type invalido",
                "checklist", buildDetailedChecklist()
        );
        var createRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(createRes).path("data").path("id").asText();

        var spoofed = new MockMultipartFile("file", "frente.jpg", "application/octet-stream",
                "not-really-an-image".getBytes());

        mockMvc.perform(multipart("/api/receptions/" + receptionId + "/photos")
                        .file(spoofed)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /api/files/:path - requiere autenticación")
    void serveFile_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/files/receptions/some-id/photo.jpg"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/files/:path - deniega acceso a foto de otro tenant")
    void serveFile_otherTenant_returns403() throws Exception {
        var body = Map.of(
                "vehicle_id", vehicleId,
                "entry_km", 42000,
                "reported_problem", "Prueba de aislamiento entre tenants",
                "checklist", buildDetailedChecklist()
        );
        var createRes = mockMvc.perform(post("/api/receptions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andReturn().getResponse().getContentAsString();
        String receptionId = objectMapper.readTree(createRes).path("data").path("id").asText();

        var photo = new MockMultipartFile("file", "frente.jpg", "image/jpeg",
                "fake-image-bytes".getBytes());
        var photoRes = mockMvc.perform(multipart("/api/receptions/" + receptionId + "/photos")
                        .file(photo)
                        .header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        String photoUrl = objectMapper.readTree(photoRes).path("data").path("photos").get(0).asText();
        String relativePath = photoUrl.substring(photoUrl.indexOf("receptions/"));

        String otherTenantToken = registerTenantAndGetToken("otro-taller@test.rd", "pass1234");

        mockMvc.perform(get("/api/files/" + relativePath)
                        .header("Authorization", "Bearer " + otherTenantToken))
                .andExpect(status().isForbidden());
    }
}
