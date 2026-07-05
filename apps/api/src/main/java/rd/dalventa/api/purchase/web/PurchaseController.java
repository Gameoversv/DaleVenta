package rd.dalventa.api.purchase.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.purchase.dto.CreatePurchaseRequest;
import rd.dalventa.api.purchase.dto.PurchaseResponse;
import rd.dalventa.api.purchase.service.PurchaseService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/purchases")
@RequiredArgsConstructor
public class PurchaseController {

    private final PurchaseService service;

    @GetMapping
    public ApiResponse<List<PurchaseResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return service.list(page, size);
    }

    @GetMapping("/{id}")
    public ApiResponse<PurchaseResponse> findById(@PathVariable UUID id) {
        return ApiResponse.ok(service.findById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PurchaseResponse> create(@Valid @RequestBody CreatePurchaseRequest req) {
        return ApiResponse.ok(service.create(req));
    }
}
