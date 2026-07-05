package rd.dalventa.api.quote.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.quote.dto.CreateQuoteRequest;
import rd.dalventa.api.quote.dto.QuoteResponse;
import rd.dalventa.api.quote.dto.UpdateQuoteStatusRequest;
import rd.dalventa.api.quote.service.QuoteService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class QuoteController {

    private final QuoteService service;

    @GetMapping("/api/work-orders/{workOrderId}/quotes")
    public ApiResponse<List<QuoteResponse>> listByWorkOrder(@PathVariable UUID workOrderId) {
        return ApiResponse.ok(service.findByWorkOrder(workOrderId));
    }

    @GetMapping("/api/quotes/{id}")
    public ApiResponse<QuoteResponse> findById(@PathVariable UUID id) {
        return ApiResponse.ok(service.findById(id));
    }

    @PostMapping("/api/quotes")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<QuoteResponse> create(@Valid @RequestBody CreateQuoteRequest req) {
        return ApiResponse.ok(service.create(req));
    }

    @PatchMapping("/api/quotes/{id}/status")
    public ApiResponse<QuoteResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateQuoteStatusRequest req
    ) {
        return ApiResponse.ok(service.updateStatus(id, req));
    }
}
