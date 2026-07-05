package rd.dalventa.api.reception.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import rd.dalventa.api.reception.dto.CreateReceptionRequest;
import rd.dalventa.api.reception.dto.ReceptionResponse;
import rd.dalventa.api.reception.dto.SaveSignatureRequest;
import rd.dalventa.api.reception.service.ReceptionService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/receptions")
@RequiredArgsConstructor
public class ReceptionController {

    private final ReceptionService service;

    @GetMapping
    public ApiResponse<List<ReceptionResponse>> findAll(
            @RequestParam(defaultValue = "0") int page) {
        return service.findAll(page);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ReceptionResponse> create(@Valid @RequestBody CreateReceptionRequest request) {
        return ApiResponse.ok(service.create(request));
    }

    @GetMapping("/{id}")
    public ApiResponse<ReceptionResponse> findById(@PathVariable UUID id) {
        return ApiResponse.ok(service.findById(id));
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ReceptionResponse> addPhoto(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file
    ) throws IOException {
        return ApiResponse.ok(service.addPhoto(id, file));
    }

    @PutMapping("/{id}/signature")
    public ApiResponse<ReceptionResponse> saveSignature(
            @PathVariable UUID id,
            @RequestBody SaveSignatureRequest request
    ) {
        return ApiResponse.ok(service.saveSignature(id, request));
    }
}
