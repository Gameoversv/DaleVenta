package rd.dalventa.api.payment.web;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import rd.dalventa.api.payment.dto.CreatePaymentRequest;
import rd.dalventa.api.payment.dto.PaymentResponse;
import rd.dalventa.api.payment.service.PaymentService;
import rd.dalventa.api.shared.web.ApiResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping("/api/invoices/{invoiceId}/payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> list(@PathVariable UUID invoiceId) {
        return ResponseEntity.ok(paymentService.listByInvoice(invoiceId));
    }

    @PostMapping("/api/payments")
    public ResponseEntity<ApiResponse<PaymentResponse>> create(@RequestBody CreatePaymentRequest req) {
        return ResponseEntity.ok(paymentService.create(req));
    }
}
